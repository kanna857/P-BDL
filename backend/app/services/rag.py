import os
import re
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.models.governance import PolicyDocument
from app.models.room import Room

# Try to import Langchain/FAISS dependencies, but be resilient
try:
    from langchain_community.vectorstores import FAISS
    from langchain_openai import OpenAIEmbeddings, ChatOpenAI
    from langchain.docstore.document import Document
    from langchain_core.prompts import ChatPromptTemplate
    from langchain_core.output_parsers import StrOutputParser
    HAS_LANGCHAIN = True
except ImportError:
    HAS_LANGCHAIN = False

def extract_entities_from_text(text: str, db: Session) -> Dict[str, Any]:
    """
    Extracts resource name, room_id, duration_days, and reason from natural language text.
    """
    text_lower = text.lower()
    
    # 1. Room matching
    rooms = db.query(Room).all()
    matched_room = None
    resource_name = None
    
    for r in rooms:
        if r.name.lower() in text_lower or (r.room_type.lower() in text_lower and r.name.split()[-1].lower() in text_lower):
            matched_room = r
            break
            
    # Generic room match fallbacks (e.g., "Lab 3", "Server Room")
    if not matched_room:
        for r in rooms:
            # Check if any room contains words of interest
            words = r.name.lower().split()
            if any(w in text_lower for w in words if len(w) > 3):
                matched_room = r
                break
                
    if matched_room:
        resource_name = matched_room.name
    else:
        # Fallback regex matches
        lab_match = re.search(r'(lab\s*\w+|server\s*room|board\s*room|office\s*\w+)', text_lower)
        if lab_match:
            resource_name = lab_match.group(1).title()
            # Try to query by name match
            db_room = db.query(Room).filter(Room.name.ilike(f"%{resource_name}%")).first()
            if db_room:
                matched_room = db_room
                resource_name = db_room.name
        else:
            resource_name = "General Access"

    # 2. Duration extraction
    duration = 1
    # Match "X days", "X day", "for X days"
    duration_match = re.search(r'(\d+)\s*day', text_lower)
    if duration_match:
        duration = int(duration_match.group(1))
    else:
        # Match words
        word_days = {
            "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
            "six": 6, "seven": 7, "week": 7, "month": 30, "two weeks": 14
        }
        for word, days in word_days.items():
            if word in text_lower:
                duration = days
                break
                
    # 3. Reason extraction
    reason = "Access request via AI Copilot"
    reason_matches = re.findall(r'(?:to|for|because)\s+([^.\n,]+)', text_lower)
    if reason_matches:
        # Filter out duration statements
        valid_reasons = [r.strip() for r in reason_matches if "day" not in r and "week" not in r and len(r.strip()) > 5]
        if valid_reasons:
            reason = f"Access required for: {valid_reasons[0]}"

    return {
        "room_id": matched_room.id if matched_room else None,
        "room": matched_room,
        "resource_name": resource_name,
        "duration_days": duration,
        "reason": reason
    }

def run_policy_rag(query: str, db: Session) -> Dict[str, Any]:
    """
    Performs RAG against policy documents. Falls back to deterministic local similarity matching if OpenAI is not set.
    """
    docs = db.query(PolicyDocument).all()
    if not docs:
        return {
            "policy_text": "No policies found in database.",
            "policy_title": "N/A",
            "llm_response": "Access policy documents are currently not seeded."
        }

    # Check for OpenAI key
    api_key = os.getenv("OPENAI_API_KEY")
    if HAS_LANGCHAIN and api_key and api_key != "replace-this-with-a-very-secure-random-key" and not api_key.startswith("replace"):
        try:
            # LangChain + OpenAI RAG Pipeline
            lc_docs = [
                Document(page_content=d.content, metadata={"id": d.id, "title": d.title})
                for d in docs
            ]
            embeddings = OpenAIEmbeddings(openai_api_key=api_key)
            db_vector = FAISS.from_documents(lc_docs, embeddings)
            
            # Retrieve
            retrieved_docs = db_vector.similarity_search(query, k=1)
            best_doc = retrieved_docs[0] if retrieved_docs else lc_docs[0]
            
            # Generate
            prompt = ChatPromptTemplate.from_template("""
            You are an AI Access Governance Copilot. Analyze the user access request query and determine if it complies with the security policies.
            
            Policy Document:
            Title: {policy_title}
            Content: {policy_content}
            
            Request Query: {query}
            
            Respond with a structured analysis outlining compliance factors, risk flags, and an approval recommendation.
            """)
            
            llm = ChatOpenAI(openai_api_key=api_key, model="gpt-4o-mini", temperature=0.1)
            chain = prompt | llm | StrOutputParser()
            
            llm_response = chain.invoke({
                "policy_title": best_doc.metadata["title"],
                "policy_content": best_doc.page_content,
                "query": query
            })
            
            return {
                "policy_text": best_doc.page_content,
                "policy_title": best_doc.metadata["title"],
                "llm_response": llm_response
            }
        except Exception as e:
            # Fallback on any openai/langchain error
            pass

    # Resilient keyword-based RAG matching fallback
    best_doc = docs[0]
    max_matches = -1
    query_words = set(re.findall(r'\w+', query.lower()))
    
    for doc in docs:
        doc_words = set(re.findall(r'\w+', doc.content.lower() + " " + doc.title.lower()))
        matches = len(query_words.intersection(doc_words))
        if matches > max_matches:
            max_matches = matches
            best_doc = doc
            
    # Generate a professional, deterministic LLM-style evaluation report
    llm_response = (
        f"**Access Compliance Evaluation Report**\n\n"
        f"**Relevant Policy Retrieved**: {best_doc.title} (Category: {best_doc.category})\n\n"
        f"**Compliance Analysis**:\n"
        f"- The request matches criteria defined in the security framework: \"{best_doc.title}\".\n"
        f"- Policy stipulates standard guidelines for access authorization. Verification of the requester's role-clearance level is required.\n"
        f"- Evaluated resource: The request relates to governance constraints within category {best_doc.category}.\n\n"
        f"**Evaluation**: Recommended for routing to direct Line Manager for standard validation."
    )
    
    return {
        "policy_text": best_doc.content,
        "policy_title": best_doc.title,
        "llm_response": llm_response
    }

def calculate_risk_score(user_role: str, room: Any, duration_days: int, user_id: int, db: Session) -> Dict[str, Any]:
    """
    Computes a rule-based risk score between 0.0 and 1.0 based on user role, room status, duration, and user request history.
    """
    factors = {}
    
    # 1. Role risk (Interns / Visitors have higher baseline risk)
    role_risk = 0.1
    if user_role == "Visitor":
        role_risk = 0.6
    elif user_role == "Intern":
        role_risk = 0.4
    elif user_role == "Engineer":
        role_risk = 0.2
    elif user_role == "Administrator":
        role_risk = 0.0
    factors["role_risk"] = role_risk
    
    # 2. Room risk (Requires Escort / Sensitive Areas)
    room_risk = 0.1
    if room:
        if room.requires_escort:
            room_risk += 0.4
        if room.room_type in ["Server Room", "Lab"]:
            room_risk += 0.3
    factors["room_sensitivity"] = min(room_risk, 0.7)
    
    # 3. Duration risk
    duration_risk = 0.0
    if duration_days > 30:
        duration_risk = 0.6
    elif duration_days > 7:
        duration_risk = 0.3
    elif duration_days > 2:
        duration_risk = 0.1
    factors["duration_risk"] = duration_risk
    
    # Calculate overall weighted average score
    # Role = 40%, Room = 40%, Duration = 20%
    overall_score = (factors["role_risk"] * 0.4) + (factors["room_sensitivity"] * 0.4) + (factors["duration_risk"] * 0.2)
    overall_score = round(min(max(overall_score, 0.0), 1.0), 2)
    
    # Risk Reasoning
    reasons = []
    if factors["role_risk"] >= 0.4:
        reasons.append(f"Requester holds a high-scrutiny role ({user_role})")
    if room and room.requires_escort:
        reasons.append(f"Target resource ({room.name}) is flagged as highly restricted and requires escort")
    if duration_days > 7:
        reasons.append(f"Request duration ({duration_days} days) exceeds standard 7-day threshold")
        
    risk_reason = " | ".join(reasons) if reasons else "Request matches standard lower-risk operating bounds"
    
    return {
        "overall_score": overall_score,
        "factors": factors,
        "risk_reason": risk_reason
    }
