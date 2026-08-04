from app.models.audit import AuditLog

def log_admin_action(db, admin_id, action, target_id=None, details=None):
    log = AuditLog(
        admin_id=admin_id, 
        action=action, 
        target_id=target_id, 
        details=details
    )
    db.add(log)
    db.commit()