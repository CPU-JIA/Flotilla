# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**基于云计算的开发协作平台 (Cloud-based Development Collaboration Platform)**

This is an academic software engineering project following a structured development lifecycle:

1. Requirements Analysis
2. Software Architecture Design (UML-based)
3. UI/Frontend Development
4. Database Design
5. Distributed Consensus Algorithm Implementation
6. Backend API & Integration
7. Testing & Quality Assurance
8. Documentation & Summary

The project follows a **frontend-backend separation architecture** and will implement a **distributed consensus algorithm** as a core component.

## Project Philosophy

- **Academic Rigor**: Each phase must produce comprehensive documentation before implementation
- **Separation of Concerns**: Frontend and backend are developed and maintained separately
- **Documentation-First**: All design decisions must be documented before coding
- **Distributed Architecture**: The system is designed for cloud-based deployment with distributed consensus

## Architecture Principles

### Frontend Architecture
- Static pages designed first, then integrated with backend APIs
- Modern frontend framework expected (to be determined in design phase)
- Component-based UI design following UML models

### Backend Architecture
- RESTful API design with clear interface contracts
- Distributed consensus algorithm for coordination
- Cloud-native deployment model
- Database-backed persistent storage

### Key Technical Components
1. **Distributed Consensus Module**: Core algorithm for platform coordination
2. **API Layer**: Frontend-backend communication interface
3. **Database Layer**: Persistent storage following normalized design
4. **UI Components**: Reusable frontend modules

## Development Workflow

### Phase-by-Phase Approach
Each development phase follows this pattern:
1. Review existing documentation (requirements, architecture, database design)
2. Implement according to documented specifications
3. Write tests to validate implementation
4. Update documentation with actual implementation details

### When Implementing New Features
1. **Check Documentation First**: Refer to 需求分析文档, 软件设计文档, 数据库设计文档
2. **Follow Architectural Patterns**: Maintain frontend-backend separation
3. **Document API Contracts**: All endpoints must have clear request/response specifications
4. **Consider Distributed Nature**: Design for scalability and cloud deployment

### Documentation Files (To Be Created)
- `docs/需求分析文档.md` - Requirements specification
- `docs/软件设计文档.md` - Architecture and UML diagrams
- `docs/UI设计与实现文档.md` - Frontend design specifications
- `docs/数据库设计文档.md` - Database schema and design
- `docs/算法设计与实现方案.md` - Distributed consensus algorithm
- `docs/接口设计及数据渲染文档.md` - API specifications
- `docs/测试计划文档.md` & `docs/软件测试报告.md` - Testing documentation

## Code Organization (Expected Structure)

```
Cloud-Dev-Platform/
├── docs/                    # All documentation
├── frontend/                # Frontend application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Page-level components
│   │   ├── services/        # API client services
│   │   └── utils/           # Frontend utilities
│   └── tests/
├── backend/                 # Backend services
│   ├── api/                 # API endpoints
│   ├── core/                # Core business logic
│   │   └── consensus/       # Distributed consensus algorithm
│   ├── database/            # Database models and migrations
│   └── tests/
└── deployment/              # Cloud deployment configs
```

## Important Considerations

### When Writing Code
- **Refer to Documentation**: Always check if design docs exist before implementing
- **Maintain Consistency**: Follow patterns established in architecture documents
- **Test Coverage**: Each module requires corresponding test cases
- **API Contracts**: Backend changes must update interface documentation

### Distributed Consensus Algorithm
- This is a core, complex component requiring algorithmic rigor
- Must be designed with formal specifications (see 算法设计与实现方案)
- Consider edge cases: network partitions, node failures, concurrent operations
- Implement comprehensive logging for distributed debugging

### Database Design
- Follow normalized design principles
- All schema changes must be documented
- Consider scalability for cloud deployment
- Use migrations for version control

### Testing Strategy
- Unit tests for individual modules
- Integration tests for API endpoints
- End-to-end tests for critical user workflows
- Performance tests for distributed consensus algorithm
- Document all test cases in 测试计划文档

## Project Status

**Current Phase**: Initial setup - awaiting requirements and architecture documentation

**Next Steps**:
1. Create requirements analysis document
2. Design software architecture with UML diagrams
3. Set up project structure for frontend and backend
4. Initialize version control and collaboration workflows
