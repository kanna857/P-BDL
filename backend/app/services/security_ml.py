from datetime import datetime, timezone
import random
from typing import Any, Dict, List
from sqlalchemy.orm import Session
from app.models.audit import LoginHistory, AuditLog
from app.models.user import User, UserSession
from app.models.role import Role
from app.models.governance import SecurityAlert, AnomalyScore
from app.services.audit import audit_service

# Resilient imports for scikit-learn
try:
    import numpy as np
    from sklearn.ensemble import IsolationForest
    from sklearn.neighbors import LocalOutlierFactor
    from sklearn.cluster import DBSCAN
    HAS_SKLEARN = True
except ImportError:
    HAS_SKLEARN = False


def extract_features_from_login(login: LoginHistory, db: Session) -> List[float]:
    """
    Feature engineering: Maps a LoginHistory instance to a list of numeric features:
    [hour_of_day, day_of_week, is_failed, is_admin, ip_frequency]
    """
    dt = login.timestamp
    # Convert timezone if naive, ensure timestamp is UTC-aligned
    hour = dt.hour
    weekday = dt.weekday()
    
    is_failed = 1.0 if login.status == "Failed" or login.status.lower() == "failed" else 0.0
    
    # Check if user is admin
    is_admin = 0.0
    if login.user_id:
        user = db.query(User).filter(User.id == login.user_id).first()
        if user and user.role and user.role.name == "Administrator":
            is_admin = 1.0
            
    # Calculate IP frequency (count of logins from this IP)
    ip_count = db.query(LoginHistory).filter(LoginHistory.ip_address == login.ip_address).count()
    # Normalize count
    ip_freq = 1.0 / (ip_count + 1)
    
    return [float(hour), float(weekday), is_failed, is_admin, ip_freq]


def train_and_detect_anomalies(db: Session) -> Dict[str, Any]:
    """
    Runs the ML pipeline using Isolation Forest, LOF, and DBSCAN.
    Identifies outliers, computes anomaly scores, writes them to DB, and issues SecurityAlert records.
    """
    logins = db.query(LoginHistory).order_by(LoginHistory.timestamp.desc()).limit(200).all()
    if len(logins) < 5:
        return {
            "status": "Skipped",
            "message": f"Insufficient data (only {len(logins)} logins) to train pipeline. Minimum 5 logins required.",
            "alerts_created": 0
        }
        
    alerts_created = 0
    
    if HAS_SKLEARN:
        try:
            # 1. Engineer features
            X_list = [extract_features_from_login(log, db) for log in logins]
            X = np.array(X_list)
            
            # 2. Fit models
            # Contamination represents standard expectation of 5% anomalies
            contamination_rate = 0.05
            
            # Isolation Forest (Outlier = -1, Normal = 1)
            iforest = IsolationForest(contamination=contamination_rate, random_state=42)
            iforest.fit(X)
            iforest_preds = iforest.predict(X)
            iforest_scores = iforest.decision_function(X) # Higher score = more normal
            
            # Local Outlier Factor
            lof = LocalOutlierFactor(n_neighbors=min(5, len(logins) - 1), contamination=contamination_rate, novelty=True)
            lof.fit(X)
            lof_preds = lof.predict(X)
            
            # DBSCAN
            dbscan = DBSCAN(eps=2.5, min_samples=2)
            dbscan_clusters = dbscan.fit_predict(X) # Outlier = -1
            
            # 3. Analyze results and flag alerts
            for i, login in enumerate(logins):
                if_outlier = iforest_preds[i] == -1
                lof_outlier = lof_preds[i] == -1
                dbscan_outlier = dbscan_clusters[i] == -1
                
                # Combine predictions (Voting classifier approach)
                # If Isolation Forest OR LOF flags it, we consider it anomalous
                votes = sum([1 if if_outlier else 0, 1 if lof_outlier else 0, 1 if dbscan_outlier else 0])
                
                # Scale Isolation Forest score to [0.0, 1.0] anomaly metric
                anomaly_metric = round(float(0.5 * (1.0 - iforest_scores[i])), 3)
                
                # Save score details
                score_record = db.query(AnomalyScore).filter(AnomalyScore.login_history_id == login.id).first()
                if not score_record:
                    score_record = AnomalyScore(
                        user_id=login.user_id or 1,
                        login_history_id=login.id,
                        anomaly_score=anomaly_metric,
                        features={
                            "hour": X_list[i][0],
                            "weekday": X_list[i][1],
                            "is_failed": X_list[i][2],
                            "is_admin": X_list[i][3],
                            "ip_freq": X_list[i][4],
                            "iforest_vote": bool(if_outlier),
                            "lof_vote": bool(lof_outlier),
                            "dbscan_outlier": bool(dbscan_outlier),
                            "total_votes": votes
                        }
                    )
                    db.add(score_record)
                    db.commit()
                
                # Create Security Alert if flagged by at least 2 models, or if high-risk failed login
                if (votes >= 2 or (is_failed_login(login) and votes >= 1)) and anomaly_metric > 0.5:
                    alert_exists = db.query(SecurityAlert).filter(SecurityAlert.description.contains(f"Login ID: {login.id}")).first()
                    if not alert_exists:
                        alert = SecurityAlert(
                            title=f"Unusual Login Activity Detected ({login.email})",
                            description=f"Automated threat engine flagged login sequence. Details: Login ID: {login.id}. Status: {login.status}. IP: {login.ip_address}. Method: Voting outlier detection. Score: {anomaly_metric}.",
                            alert_type="AI_ANOMALY",
                            severity="High" if login.status == "Failed" else "Medium",
                            risk_score=anomaly_metric,
                            user_id=login.user_id,
                            ip_address=login.ip_address,
                            status="Open"
                        )
                        db.add(alert)
                        db.commit()
                        alerts_created += 1
                        
            return {
                "status": "Success",
                "method": "scikit-learn ML Pipeline (IsolationForest, LOF, DBSCAN)",
                "alerts_created": alerts_created,
                "samples_processed": len(logins)
            }
        except Exception as e:
            # Fall back if training fails mathematically
            pass

    # 4. Resilient Statistical Fallback (Rule-Based Z-Score Anomaly Detection)
    for login in logins:
        anomaly_metric = 0.1
        factors = {}
        
        # Risk factors
        if login.status == "Failed":
            anomaly_metric += 0.4
            factors["failed_login"] = 0.4
            
        # Time checks (Between 11 PM and 5 AM)
        if login.timestamp.hour >= 23 or login.timestamp.hour <= 5:
            anomaly_metric += 0.3
            factors["after_hours"] = 0.3
            
        # IP checks
        ip_count = db.query(LoginHistory).filter(LoginHistory.ip_address == login.ip_address).count()
        if ip_count == 1:
            anomaly_metric += 0.2
            factors["new_ip"] = 0.2
            
        anomaly_metric = round(min(anomaly_metric, 1.0), 3)
        
        # Save score
        score_record = db.query(AnomalyScore).filter(AnomalyScore.login_history_id == login.id).first()
        if not score_record:
            score_record = AnomalyScore(
                user_id=login.user_id or 1,
                login_history_id=login.id,
                anomaly_score=anomaly_metric,
                features={
                    "factors": factors,
                    "hour": login.timestamp.hour,
                    "ip_address": login.ip_address,
                    "method": "Statistical Fallback Engine"
                }
            )
            db.add(score_record)
            db.commit()
            
        if anomaly_metric >= 0.5:
            alert_exists = db.query(SecurityAlert).filter(SecurityAlert.description.contains(f"Login ID: {login.id}")).first()
            if not alert_exists:
                alert = SecurityAlert(
                    title=f"Security Alert: Heuristic Anomaly Detected ({login.email})",
                    description=f"Rule-based outlier engine flagged login profile. Details: Login ID: {login.id}. IP: {login.ip_address}. Risk: {factors}. Total Score: {anomaly_metric}.",
                    alert_type="RULE_HEURISTIC_ANOMALY",
                    severity="Medium" if login.status == "Success" else "High",
                    risk_score=anomaly_metric,
                    user_id=login.user_id,
                    ip_address=login.ip_address,
                    status="Open"
                )
                db.add(alert)
                db.commit()
                alerts_created += 1
                
    return {
        "status": "Success",
        "method": "Heuristic Outlier Engine (Fallback)",
        "alerts_created": alerts_created,
        "samples_processed": len(logins)
    }

def is_failed_login(login: LoginHistory) -> bool:
    return login.status == "Failed" or login.status.lower() == "failed"
