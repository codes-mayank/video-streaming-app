from fastapi import HTTPException

from app.adapter.singleton import Singleton


class AuthAdapter(metaclass=Singleton):
    
    def validate_signup_user(self, existing_user, user_in):
        error_messages = []
        if existing_user and user_in.username in (db_user.username for db_user in existing_user):
            error_messages.append({"field": "username", "message": "User already exists"})
        if existing_user and user_in.email in (db_user.email for db_user in existing_user):
            error_messages.append({"field": "email", "message": "Email already registered"})
        if error_messages:
            raise HTTPException(status_code=400, detail=error_messages)