from fastapi import APIRouter
from app.api.v1.endpoints import auth, admin

# 创建主路由
api_router = APIRouter()

# 包含认证相关路由
api_router.include_router(
    auth.router,
    prefix="/auth",
    tags=["Authentication"],
)

# 包含管理员相关路由
api_router.include_router(
    admin.router,
    prefix="/admin",
    tags=["Admin Management"],
)