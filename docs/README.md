# GeoSub 产品开发规范索引

本目录中的规范是 GeoSub v2.11 小团队开发基线。开始修改前，根据任务风险和范围阅读相应文件。

v2.11 更新的是团队工作流与核心治理规则，不要求为了统一编号而重写没有变化的领域规范。仍标记 v2.10 的设计、SEO、数据和信息架构文件代表其最后审阅版本，在被明确修订前继续有效。

## 核心规范

- [WORKFLOW.md](WORKFLOW.md)：小团队角色、风险分级、文档要求、授权边界和默认工作流。
- [PRODUCT.md](PRODUCT.md)：产品定位、用户、边界、工作分类和版本策略。
- [INFORMATION_ARCHITECTURE.md](INFORMATION_ARCHITECTURE.md)：页面类型、区块职责、导航和响应式架构。
- [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md)：颜色、排版、组件、状态、移动端和暗色规则。
- [SEO_POLICY.md](SEO_POLICY.md)：索引、URL、元数据、结构化数据、sitemap 和实验规则。
- [DATA_POLICY.md](DATA_POLICY.md)：价格、平台、来源、汇率、税费、购买力、报告和数据变更。
- [ENGINEERING_RULES.md](ENGINEERING_RULES.md)：范围、组件、数据访问、安全、提交和完成定义。
- [TESTING.md](TESTING.md)：自动化、浏览器、数据、SEO、可访问性和性能测试矩阵。
- [RELEASE.md](RELEASE.md)：版本、推送、生产升级、线上核验和回退。

## 使用顺序

所有任务先读 `WORKFLOW.md`、`PRODUCT.md` 和 `ENGINEERING_RULES.md`，再按范围补充：

- UI：`INFORMATION_ARCHITECTURE.md`、`DESIGN_SYSTEM.md`、`TESTING.md`。
- SEO：`SEO_POLICY.md`、`DATA_POLICY.md`、`TESTING.md`。
- 数据：`DATA_POLICY.md`、`TESTING.md`、`RELEASE.md`。
- 新功能：L1 写简短任务说明，L2/L3 写与风险相称的 PRD，再读所有受影响规范。
- 架构或发布：L2/L3 写与风险相称的 RFC，并读 `ENGINEERING_RULES.md`、`TESTING.md`、`RELEASE.md`。

## 文档层级

这些文件定义当前规范。带日期的审计、实验和实施记录是证据，不自动成为长期政策。历史交接和路线图可能包含过期状态；发生冲突时以当前代码、生产事实和本规范为准，并显式记录需要更新的旧文档。

## 变更规则

- 规范变更必须单独提交或在明确的 Architecture PR 中完成。
- 修改规范时说明原因、影响、迁移和生效日期。
- 代码与规范冲突时，不得静默选择其一；先确认是代码缺陷还是规范需要修订。
