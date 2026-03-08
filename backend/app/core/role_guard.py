from fastapi import HTTPException, status


def require_role(user_role: str, allowed_roles: list[str]) -> None:
    if user_role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to perform this action."
        )