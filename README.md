# 大家电服务商履约评分看板

这是一个 Vite + React 前端项目，页面口径对齐用户提供的考核规则表。

## 当前数据口径

- 考核周期名称：2026考核周期一
- 总周期：2026-05-10 至 2026-07-31
- 周期切片：每 7 天一期；最后一期为 2026.07.26 - 2026.07.30
- 服务商：海鲸、清洋、小智（熊洞智家(北京)科技有限公司）
- 履约来源：`3p大家电履约数据--2026.05.10-2026.05.16.xlsx`
- 客诉/时效来源：`3p客诉数据--2026.05.10-2026.05.16.xlsx`

## 指标权重

- 成交率：10 分，达标得满分；每低于达标线 1 个百分点扣 3 分，最多扣完
- 催上门时效内率：30 分，达标得满分；每低于达标线 1 个百分点扣 3 分，最多扣完
- 催放款时效内率：20 分，达标得满分；每低于达标线 1 个百分点扣 3 分，最多扣完
- 议价额率：20 分，达标得满分；每高于达标线 1 个百分点扣 1 分，最多扣完
- 客诉率：20 分，达标得满分；每高于达标线 0.1 个百分点扣 2 分，最多扣完
- 飞单量：每发现 1 条飞单扣 10 分，可累计扣完

## 数据上传

运营账号登录后会出现“数据上传”tab。评分数据、上传历史、服务商省份划分都由服务端 API 从 DuckDB 读取；服务商账号不会看到上传入口。

页面周期选择器包含：

- 总览周期：汇总所有已上传周周期后重新按同一口径计算总分
- 第1期至第12期：查看单周评分结果

支持两类数据源：

- 履约数据源：按服务商匹配并按目标周期聚合成交率、议价额率
- 客诉/时效数据源：按服务商匹配并覆盖催上门时效、催放款时效、客诉率

支持文件格式：`.csv`、`.xlsx`。服务商可用简称或企业名匹配，例如“小智”或“熊洞智家(北京)科技有限公司”。

## 本地运行

```bash
npm install
npm run dev
```

前端开发服务器会代理 `/api` 到本地服务端。生产模式可先构建再启动 Node/Express：

```bash
npm run build
npm start
```

## 验证

```bash
npm run lint
npm run build
```

## 服务端登录配置

当前版本登录校验在服务端完成，密码从服务端环境变量读取，不再打包进前端 JS。评分数据也只通过当前登录账号对应的 API 权限返回。部署前需要配置：

```bash
ADMIN_PASSWORD="替换为运营账号密码"
QINGYANG_PASSWORD="替换为清洋账号密码"
HAIJING_PASSWORD="替换为海鲸账号密码"
XIAOZHI_PASSWORD="替换为小智账号密码"
SESSION_TTL_MS=28800000
DATA_DIR="./data"
```

`SESSION_TTL_MS` 默认 8 小时。云服务器上建议把这些变量放到 `.env`、Docker Compose 环境变量或服务器密钥管理里，不要写入前端代码。

## DuckDB 数据库

默认数据库路径为 `./data/fulfillment.duckdb`，也可以用 `DUCKDB_PATH` 指定完整路径。首次启动时会写入账号、密码哈希、第 1 期默认评分和服务商省份划分。

当前表：

- `accounts`：保存账号、密码哈希、会话角色信息
- `period_rows`：按周期和服务商保存评分明细
- `upload_history`：保存最近 50 条上传历史
- `upload_source_rows`：按上传批次保存源文件解析后的每一行，当前不做去重
- `allocation_summary`：保存服务商省份划分

DuckDB 会对数据库文件加锁；服务运行时不要用另一个进程直接打开同一个 `.duckdb` 文件。如需排查，先停服务再用 DuckDB CLI 或脚本读取。

## Docker 部署

本项目已提供 `Dockerfile` 和 `docker-compose.yml`。默认容器内使用 Node/Express 服务静态构建产物、登录 API 和 DuckDB 数据库，宿主机端口为 `6001`。DuckDB 数据保存在 Docker volume `fulfillment-score-data` 中。

本地构建并启动：

```bash
cp .env.example .env
docker compose up -d --build
```

指定宿主机端口：

```bash
APP_PORT=8080 docker compose up -d --build
```

查看状态：

```bash
docker compose ps
docker compose logs -f
```

停止服务：

```bash
docker compose down
```

服务器部署建议：

```bash
scp -r 服务商综合考核看板 <user>@<server>:/opt/fulfillment-score-dashboard
ssh <user>@<server>
cd /opt/fulfillment-score-dashboard
docker compose up -d --build
```
