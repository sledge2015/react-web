from fastapi import FastAPI, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from database import SessionLocal, engine, Base
import crud, schemas, auth
from jose import jwt, JWTError
from typing import Optional

# 创建数据库表
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="User Auth & Admin API",
    description="API for user registration, login, profile, and admin management",
    version="1.0.0",
    docs_url="/docs",          # Swagger UI
    redoc_url="/redoc",        # ReDoc 文档
    openapi_url="/openapi.json" # OpenAPI JSON
)

# 依赖：获取数据库会话
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# 注册用户
@app.post("/api/auth/register",
          response_model=schemas.UserOut,
          summary="用户注册",
          description="使用用户名、邮箱和密码注册新用户",
          tags=["Auth"])
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    """
    Create a new user in the database.
    """
    if crud.get_user_by_username(db, user.username):
        raise HTTPException(status_code=400, detail="Username already exists")
    db_user = crud.create_user(db, user.username, user.email, user.password)
    return db_user

# 登录
@app.post("/api/auth/login",
          response_model=schemas.LoginResponse,
          summary="User login",
          tags=["Auth"])
def login(data: schemas.LoginRequest, db: Session = Depends(get_db)):
    """
    Authenticate user and return a JWT token.
    """
    user = crud.get_user_by_username(db, data.username)
    if not user or not crud.verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = auth.create_access_token({"sub": user.username})
    return {"user": user, "token": token}

# 获取当前用户
@app.get("/api/auth/me",
         response_model=schemas.UserOut,
         summary="Get current user info",
         tags=["Auth"])
def get_me(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    """
    Retrieve the current logged-in user's information.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing token")
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        username = payload.get("sub")
        user = crud.get_user_by_username(db, username)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# 管理用户：获取列表
@app.get("/api/admin/users",
         response_model=list[schemas.UserOut],
         summary="List all users",
         tags=["Admin"])
def list_users(db: Session = Depends(get_db)):
    """
    Admin endpoint to retrieve all users.
    """
    return crud.get_all_users(db)

# 管理用户：激活/禁用
@app.put("/api/admin/users/{user_id}/active",
         response_model=schemas.UserOut,
         summary="Activate/Deactivate user",
         tags=["Admin"])
def set_user_active(user_id: int, is_active: bool, db: Session = Depends(get_db)):
    """
    Admin endpoint to activate or deactivate a user account.
    """
    user = crud.set_user_active(db, user_id, is_active)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
