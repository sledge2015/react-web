## 代码目录结构
````
backend/
├── app/                        # 应用核心代码
│   ├── __init__.py
│   ├── main.py                 # FastAPI 应用入口
│   ├── core/                   # 核心配置
│   │   ├── __init__.py
│   │   ├── config.py           # 配置管理
│   │   ├── database.py         # 数据库连接
│   │   └── security.py         # 安全相关(JWT等)
│   ├── models/                 # 数据库模型
│   │   ├── __init__.py
│   │   └── user.py
│   ├── schemas/                # Pydantic 模式
│   │   ├── __init__.py
│   │   └── user.py
│   ├── api/                    # API 路由
│   │   ├── __init__.py
│   │   ├── deps.py             # 依赖注入
│   │   └── v1/                 # API 版本管理
│   │       ├── __init__.py
│   │       ├── router.py       # 主路由
│   │       └── endpoints/
│   │           ├── __init__.py
│   │           ├── auth.py     # 认证相关接口
│   │           └── admin.py    # 管理员接口
│   └── services/               # 业务逻辑层
│       ├── __init__.py
│       ├── user_service.py     # 用户服务
│       └── auth_service.py     # 认证服务
├── scripts/                    # 脚本文件
│   └── start_service.sh
├── tests/                      # 测试文件(预留)
│   └── __init__.py
├── requirements.txt            # 依赖文件
└── .env                       # 环境变量
````