from sqlalchemy.orm import Session
from models import User
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_user_by_username(db: Session, username: str):
    return db.query(User).filter(User.username == username).first()

def get_user_by_id(db: Session, user_id: int):
    return db.query(User).filter(User.id == user_id).first()

def create_user(db: Session, username: str, email: str, password: str):
    hashed_password = pwd_context.hash(password)
    db_user = User(username=username, email=email, hashed_password=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_all_users(db: Session):
    return db.query(User).all()

def set_user_active(db: Session, user_id: int, is_active: bool):
    user = get_user_by_id(db, user_id)
    if user:
        user.is_active = is_active
        db.commit()
        db.refresh(user)
    return user
