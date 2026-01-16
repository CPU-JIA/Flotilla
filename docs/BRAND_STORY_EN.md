# Flotilla Brand Story

> **Tagline:** _We don't just host code. We build consensus._
> **标语：** _我们不只是托管代码，我们构建共识。_

---

**Version:** 2.0.0
**Last Updated:** 2025-10-28
**Word Count:** ~7,000 words
**Reading Time:** ~18 minutes

---

## Table of Contents

1. [The Secret Behind "Flotilla"](#chapter-1-the-secret-behind-flotilla)
2. [Origin: The Distributed Collaboration Paradox](#chapter-2-origin-the-distributed-collaboration-paradox)
3. [8 Mappings: Raft → Team Collaboration](#chapter-3-8-mappings-raft--team-collaboration)
4. [Engineering Principles: Our Technical Faith](#chapter-4-engineering-principles-our-technical-faith)
5. [5 Developer Nightmares We Solve](#chapter-5-5-developer-nightmares-we-solve)
6. [Why Not GitHub/GitLab?](#chapter-6-why-not-githubgitlab)
7. [Tech Stack as Belief System](#chapter-7-tech-stack-as-belief-system)
8. [Three Pillars of Open Source](#chapter-8-three-pillars-of-open-source)
9. [Collaboration in 2030](#chapter-9-collaboration-in-2030)
10. [Join Us](#chapter-10-join-us)

---

## Chapter 1: The Secret Behind "Flotilla"

### 1.1 Etymology: The Small Fleet Metaphor

**Flotilla** comes from Spanish _flota_ (fleet) + _-illa_ (diminutive suffix), meaning "small fleet." In military terminology, it refers to a coordinated formation of small vessels—each ship is independent and autonomous, yet they operate under unified command.

This isn't random naming. It's a carefully chosen technical metaphor.

### 1.2 Four Layers of Technical Metaphor

**Layer 1: Distributed Nodes as Fleet Formation**

Imagine a flotilla of destroyers sailing across the ocean. Each ship (Node) has its own propulsion system, navigation system, and weapons system—capable of operating independently. But when they form a fleet, their power multiplies—not because individual ships got stronger, but because they **coordinate**.

This perfectly maps to the core mechanism of the Raft consensus algorithm:

- Each node is an independent server
- They coordinate through a consensus protocol
- Even if the flagship (Leader) sinks, the fleet can elect a new command ship
- The fleet's reliability doesn't depend on any single ship being indestructible—it depends on **dynamic reorganization**

**Layer 2: Agile Teams, Not Aircraft Carriers**

Notice we don't call ourselves _Carrier_ or _Battleship_, but _Flotilla_ (small fleet).

This reveals our target users:

- Not large corporate hierarchies (carrier strike groups)
- But startups, open-source projects, agile teams (destroyer flotillas)
- Fast response, flexible adaptation, yet still powerful

An aircraft carrier requires thousands of personnel. A small fleet needs only dozens—but can accomplish equally diverse missions. This is the team type we want to empower.

**Layer 3: Decentralized Yet Orderly**

A fleet isn't one super-ship—it's a union of multiple small ships. This maps to the **decentralization philosophy** of distributed systems.

But decentralization isn't anarchy. Fleets have a flagship (Leader), communication protocols, tactical discipline. These rules aren't permanent—flagships can be replaced, command can transfer—but at any moment, the chain of command is clear.

This is the essence of Raft: **dynamic consensus**. Each election is a process of reaffirming leadership. Leadership is authorization based on consensus, not permanent privilege.

**Layer 4: Fault Tolerance and High Availability**

In naval combat, one ship going down doesn't paralyze the entire fleet. The formation can reorganize, repair, and continue forward.

This perfectly corresponds to Raft's fault-tolerance mechanism:

- An N-node cluster can tolerate (N-1)/2 node failures
- When the Leader crashes, the system automatically elects a new Leader—no manual intervention
- Data is preserved across multiple nodes through log replication; single-point failures don't lose data

**Flotilla = Fault-tolerant, Dynamic, Coordinated. This is our technical DNA.**

### 1.3 Brand Extensions: From Name to Visual

Based on this metaphor, we can extend a complete brand system:

- **Logo Design**: Three ships in formation (representing a typical 3-node Raft cluster)
- **Terminology System**:
  - Node → Ship
  - Leader → Flagship
  - Cluster → Fleet
  - Heartbeat → Signal Flag
- **Slogan Variants**:
  - _"We sail together."_
  - _"One fleet, one truth."_

---

## Chapter 2: Origin: The Distributed Collaboration Paradox

### 2.1 The Core Problem

When software teams scatter across the globe, we've mastered **distributed systems** technology—data can replicate across multiple data centers, services can deploy across continents. CAP theorem, consistent hashing, distributed transactions—these problems have mature solutions.

But ironically, we still struggle with **distributed collaboration**:

- Merge conflicts
- Permission disputes
- Communication breakdowns
- Decision paralysis

The essence of these problems isn't technical—it's **the absence of consensus**.

### 2.2 The Moment of Inspiration

Late one night in 2024, while reading the Raft paper (_In Search of an Understandable Consensus Algorithm_), I suddenly realized:

**If the Raft algorithm can achieve consensus among distributed nodes, why can't distributed teams?**

- Raft solves "who decides" through Leader Election
- Raft solves "how to sync state" through Log Replication
- Raft solves "how to avoid dictatorship and deadlock" through Majority Quorum

Aren't these the essential problems of team collaboration?

In that moment, Flotilla's vision was born: **Make distributed teams as reliable as distributed systems.**

### 2.3 Academic Rigor + Production Ready

This isn't a weekend hack. This is an academic practice following the complete software engineering lifecycle:

**Requirements → Architecture → Implementation → Testing → Documentation**

- Every line of code is backed by design docs (8 design documents in `/docs`)
- Every feature has test coverage (12,534 lines of test code, >70% coverage)
- Every decision follows **ECP (Engineering & Code Principles)** (SOLID, DRY, KISS, defensive programming)

We write paper-grade documentation _and_ production-grade code. **No compromises. Both.**

---

## Chapter 3: 8 Mappings: Raft → Team Collaboration

Raft isn't just an algorithm—it's a **philosophical system** about how to achieve consensus. Below are 8 deep mappings between Raft's core mechanisms and team collaboration.

### 3.1 Leader Election → Dynamic Leadership

**Raft Mechanism:**
When the Leader crashes, Followers initiate an election. The candidate who receives majority votes becomes the new Leader. Leadership isn't permanent—it's a dynamic role based on Term.

**Team Mapping:**
When a project lead leaves, team members can naturally produce a new lead based on contribution and trust. Leadership isn't a permanent title—it's dynamic authorization based on consensus.

**Philosophy:** _Leadership is a lease, not ownership._

**Pain Point Solved:**
Traditional companies need lengthy administrative processes for leadership transitions ("Who will take over?" "Does this need CEO approval?"). Open-source projects self-organize quickly—when a Maintainer becomes inactive, active Contributors naturally take responsibility.

---

### 3.2 Log Replication → Knowledge Sync

**Raft Mechanism:**
The Leader replicates operation logs to all Followers, ensuring state consistency. Every node's log sequence must be identical.

**Team Mapping:**
Code commits, design docs, meeting notes must sync to all members to ensure information alignment.

**Philosophy:** _Transparency breeds consensus._

**Pain Point Solved:**
Email threads lost, Slack messages buried, meeting decisions unrecorded—these are all "log replication failures." Flotilla ensures all decisions have immutable records through the Issue/PR system.

---

### 3.3 Term → Sprint/Milestone Periodic Reconfirmation

**Raft Mechanism:**
Each election produces a new Term. Decisions from old Terms won't be recognized (Stale Data problem).

**Team Mapping:**
Reconfirm priorities after each Sprint. Requirements from three months ago should be considered expired if not reconfirmed in the new Sprint.

**Philosophy:** _Time is the boundary of consensus._

**Pain Point Solved:**
"We discussed this requirement six months ago"—but the market changed, the tech stack changed, team members changed. Expired consensus is more dangerous than no consensus.

---

### 3.4 Majority Quorum → Code Review Approval

**Raft Mechanism:**
Operations need confirmation from a majority of nodes (N/2 + 1) to commit. This avoids dictatorship (1 node decides) and deadlock (all nodes must agree).

**Team Mapping:**
PRs need approval from 2 Reviewers to merge (Require 2 approvals). Not one tech lead decides alone, nor does everyone need to thumbs-up.

**Philosophy:** _Consensus isn't dictatorship, nor unanimous voting—it's majority rule._

**Pain Point Solved:**
One person decides → Dictatorship, error-prone
Everyone must agree → Inefficient, never reaches consensus
Majority rule → Balances quality and efficiency

---

### 3.5 Append-Only Log → Git's Immutable History

**Raft Mechanism:**
Logs can only be appended, never modified (Immutability). This guarantees auditability.

**Team Mapping:**
Git commit history shouldn't be overwritten by force push (No force push to main). Branch Protection enforces this rule.

**Philosophy:** _History is truth, not memory that can be tampered with._

**Pain Point Solved:**
Code history destroyed by `git rebase`, root causes untraceable. "Who introduced this bug?" "Don't know, commit history was rewritten."

---

### 3.6 Heartbeat → Activity Monitoring

**Raft Mechanism:**
The Leader periodically sends heartbeats. If a Follower doesn't receive a heartbeat within the timeout, it assumes the Leader is down and initiates a new election.

**Team Mapping:**
Members long inactive (no commits, no reviews, no comments) require task or permission reassignment.

**Philosophy:** _Silence isn't default agreement—it's a disconnection signal._

**Pain Point Solved:**
Members "AFK" for weeks, but because no one raises it, the project stays stuck. Flotilla's activity stats make this situation obvious.

---

### 3.7 State Machine → Project Evolution Path

**Raft Mechanism:**
All nodes apply the same operation sequence (Log Entries), ultimately reaching the same state (State Machine Replication).

**Team Mapping:**
All members follow the same development process (branching strategy, CI/CD), ensuring codebase consistency.

**Philosophy:** _Process is consensus made concrete._

**Pain Point Solved:**
Everyone's local environment differs, Docker configs differ, build commands differ—"Works on My Machine." Standardized processes eliminate this chaos.

---

### 3.8 Split-Brain Prevention → Branch Conflict Avoidance

**Raft Mechanism:**
Prevents two Leaders (Split-Brain problem) through Term and Log Index.

**Team Mapping:**
Prevents two "truth versions" (two feature branches both claiming to be main) through Branch Protection and PR Review.

**Philosophy:** _Single source of truth._

**Pain Point Solved:**
Two teams develop separately, both thinking their branch is "mainline." When merging, conflicts explode, taking days to resolve.

---

### Summary Statement

> **"If Raft can turn a chaotic network into a reliable state machine, why can't we turn a chaotic team into a reliable delivery machine? The algorithm isn't just code—it's a metaphor for how humans should collaborate."**

---

## Chapter 4: Engineering Principles: Our Technical Faith

Flotilla's codebase follows a strict set of engineering principles we call **ECP (Engineering & Code Principles)**. This isn't optional best practice—it's mandatory development standards.

### 4.1 SOLID Principles: Five Pillars of Architecture

- **S - Single Responsibility**: Each module does one thing
- **O - Open/Closed**: Open for extension, closed for modification
- **L - Liskov Substitution**: Subclasses can replace parent classes
- **I - Interface Segregation**: Don't force implementation of unneeded interfaces
- **D - Dependency Inversion**: Depend on abstractions, not concrete implementations

These aren't slogans—they're checklist items in every Code Review.

### 4.2 DRY & KISS: The Aesthetics of Code

- **DRY (Don't Repeat Yourself)**: Duplication is the root of all evil. We actively identify and eliminate any form of code duplication.
- **KISS (Keep It Simple, Stupid)**: Always choose the simplest, clearest implementation. Smart code isn't complex code—it's code so simple it can't fail.

### 4.3 Defensive Programming: Never Trust Input

- All external inputs (user input, API responses) must be validated
- All I/O operations must have error handling
- Database queries must prevent SQL injection
- User input must prevent XSS attacks

**Philosophy:** _In distributed systems, everything fails. In team collaboration, everything gets misunderstood. Code must be designed for failure._

### 4.4 Test-Driven Development (TDD)

- Write tests first, implement later (Red → Green → Refactor)
- Unit test coverage >70%
- E2E tests cover core user flows
- 12,534 lines of test code ensure every feature is verifiable

**Why so strict?**

Because we're building a **consensus system**. If the code itself isn't reliable, how can teams achieve consensus on top of it?

If Raft's log replication has bugs, the entire cluster will have data corruption.
If Flotilla's PR Review has bugs, the entire team will have decision corruption.

**Reliability isn't a feature—it's the foundation.**

---

## Chapter 5: 5 Developer Nightmares We Solve

These aren't edge cases—they're daily pains every developer has experienced. Flotilla doesn't solve technical problems—it solves **consensus problems in collaboration**.

### 5.1 Timezone Hell

**Pain Story:**

> "2 AM Beijing time, I got an urgent @mention from San Francisco. After fixing the bug, I discovered the London team had submitted another fix 6 hours earlier, but our solutions conflicted. Spent 3 more hours async communicating on Slack, only to find out the PM had changed requirements in Notion long ago, but no one notified the dev team."

**Flotilla Solution:**

- **Notification System**: All decisions flow through PRs, ensuring no info loss even across timezones
- **Branch Protection**: Prevents conflicting merges
- **Issue Timeline**: Requirement changes automatically recorded in Issue history

**Philosophy:** _Async collaboration requires stronger consensus mechanisms._

---

### 5.2 Permission Mess

**Pain Story:**

> "An intern accidentally force-pushed to main, overwriting three days of work. The tech lead said 'I thought you set up Branch Protection,' DevOps said 'I thought you configured CODEOWNERS,' the PM said 'I thought this was everyone's consensus.' No one knew who was truly responsible for what."

**Flotilla Solution:**

- **Organization & Team Permissions**: Hierarchical permission system (Org → Team → Project)
- **Branch Protection Rules**: Enforced, non-bypassable
- **PR Approval Requirements**: Clear records of who approved what

**Philosophy:** _Permissions are protocols, not trust._

---

### 5.3 Documentation Drift

**Pain Story:**

> "The README says this API accepts JSON, but the code's been using Protobuf for six months. Design docs are in Confluence, test cases in Jira, architecture diagrams in someone's Figma—no one knows which is latest. In meetings everyone says 'I remember we discussed this,' but no one can prove it."

**Flotilla Solution:**

- **Markdown-first Documentation**: Docs and code in the same repo
- **PRs force doc updates**: Code changes must sync README updates
- **Git Versioning**: Trace doc history alongside code history

**Philosophy:** _History is truth._

---

### 5.4 Rubber-Stamp Reviews

**Pain Story:**

> "My PR waited 3 days for someone to look, then just got an 'LGTM' with no substantive comments. After merging, production exploded. The reviewer said 'I thought you tested it,' I said 'I thought you'd check the logic.' Code Review became a formality."

**Flotilla Solution:**

- **PR Review System with Line-level Comments**: Mandatory line-level comments
- **Semantic Review States**: APPROVED vs CHANGES_REQUESTED have clear meaning
- **Merge Status Validation**: CI failed + Review not approved = Can't merge

**Philosophy:** _Consensus needs evidence, not ceremony._

---

### 5.5 Code Search Nightmare

**Pain Story:**

> "I needed to find a similar bug fixed three months ago, but couldn't remember which file. GitHub Search only searches filenames, grep is too slow. Finally asked around on Slack, discovered that file was refactored away, logic moved to another module, but no one documented the migration path."

**Flotilla Solution:**

- **MeiliSearch Code Search**: Full-text search + symbol extraction (classes, functions, variables)
- **Cross-project search**: Permission-filtered, only shows accessible code
- **Millisecond response**: No waiting, instant results

**Philosophy:** _Knowledge should be discoverable, not memorable._

---

## Chapter 6: Why Not GitHub/GitLab?

### 6.1 Differentiation Matrix

| Dimension                | GitHub                         | GitLab             | Flotilla                                      |
| ------------------------ | ------------------------------ | ------------------ | --------------------------------------------- |
| **Core Philosophy**      | Social coding                  | All-in-one DevOps  | **Consensus-driven collaboration**            |
| **Consensus Algorithm**  | None (centralized)             | None (centralized) | **Raft distributed consensus**                |
| **Permission Model**     | RBAC (role-based)              | RBAC               | **Team-based protocols**                      |
| **Notification System**  | Email + Webhook                | Email + Webhook    | **WebSocket real-time push**                  |
| **Code Search**          | ElasticSearch                  | ElasticSearch      | **MeiliSearch + symbol extraction**           |
| **Internationalization** | Community i18n (i18n-friendly) | Community i18n     | **Architecture-level bilingual (i18n-first)** |
| **Target Users**         | Open source + Enterprise       | Enterprise DevOps  | **Distributed agile teams**                   |

### 6.2 Brand Positioning

**GitHub's Slogan:** "Where the world builds software"
**GitLab's Slogan:** "One DevOps platform"
**Flotilla's Slogan:** **"We don't just host code. We build consensus."**

### 6.3 Three Core Questions

**Why not GitHub?**
→ GitHub is a social network. Flotilla is a consensus machine.

GitHub optimizes for "Stars" and "Followers"—it's a developer resume.
Flotilla optimizes for "decision speed" and "consensus quality"—it's team productivity.

**Why not GitLab?**
→ GitLab is a Swiss Army knife. Flotilla is a scalpel.

GitLab has CI/CD, monitoring, security scanning, project management… too many features to use.
Flotilla does one thing: **Make collaboration as reliable as distributed systems.** We don't pursue most features—we pursue most reliable collaboration.

**Why not self-hosted Git?**
→ Self-hosted is DIY. Flotilla is engineering.

Self-hosting Gitea/Gogs can get you started quickly, but you don't get:

- Raft consensus algorithm's distributed fault tolerance
- Team-based fine-grained permission model
- Symbol-level code search
- Production-grade notification system
- Academic-grade documentation and test coverage

### 6.4 Our Unique Value

**Positioning Statement:**

> "Flotilla is the first code hosting platform to apply distributed consensus algorithms (Raft) to team collaboration. We don't pursue most features—we pursue most reliable collaboration. If your team is scattered globally, if your project needs academic rigor, if you believe consensus is the foundation of collaboration—Flotilla is designed for you."

---

## Chapter 7: Tech Stack as Belief System

Every technology choice is a belief statement. We don't choose the most popular or the simplest—we choose **what aligns with our philosophy**.

### 7.1 Next.js 15: No Compromise on Outdated Tech

**Choice:** Next.js 15 (latest)
**Rejected:** Create React App (marked as not recommended by React official)

**Reason:**
Create React App could let us scaffold quickly, but we chose Next.js 15—even though the learning curve is steeper.

**Philosophy:** _Short-term convenience isn't worth exchanging for long-term technical debt._

---

### 7.2 Prisma: Schema Transparency

**Choice:** Prisma
**Rejected:** TypeORM

**Reason:**
TypeORM uses decorators to define models, scattered across multiple files. Prisma uses `schema.prisma` as **single source of truth**—all nodes should see the same Schema.

**Philosophy:** _Data model transparency is the foundation of system reliability._

---

### 7.3 MeiliSearch: The Power of Focus

**Choice:** MeiliSearch
**Rejected:** ElasticSearch

**Reason:**
ElasticSearch is a Swiss Army knife. MeiliSearch is a scalpel. ElasticSearch does log analysis, time-series data, full-text search, aggregation queries… MeiliSearch does one thing: **fast full-text search**.

**Philosophy:** _Focus breeds excellence._ (Just like Raft only solves consensus, not all distributed problems)

---

### 7.4 Playwright: Honesty in Testing

**Choice:** Playwright
**Rejected:** Cypress

**Reason:**
Cypress runs inside the browser, can directly access application internals (window object). Playwright only interacts through DOM and network requests—**just like real users**.

**Philosophy:** _Tests shouldn't cheat._ If tests can access internal state, they're not testing user experience—they're testing implementation details.

---

### 7.5 PostgreSQL: Strong Consistency Commitment

**Choice:** PostgreSQL
**Rejected:** MongoDB

**Reason:**
NoSQL's motto is "Eventual Consistency."
Raft's paper title is "In Search of an Understandable **Consensus** Algorithm."

We don't believe in "eventual consistency." We believe in **strong consistency**.

**Philosophy:** _Reliability over speed._ This isn't a technical choice—it's a value judgment.

---

### 7.6 Meta-Philosophy: Understandable Correctness

**Our tech stack is an extension of Raft philosophy:**

- Next.js says: We don't compromise on outdated tech
- Prisma says: We believe in Schema transparency
- MeiliSearch says: We believe in focus's power
- Playwright says: We don't cheat in tests
- PostgreSQL says: We don't sacrifice consistency

**What do these tools have in common? They all prioritize correctness over convenience.**

Just like the Raft algorithm: Paxos is more general, but Raft is more understandable; two-phase commit is simpler, but Raft is more reliable.

**Understandable correctness > Mysterious efficiency.**

---

## Chapter 8: Three Pillars of Open Source

### 8.1 Code as Democracy

**Traditional:** Open source = Free to use
**Flotilla:** **Open source = Consensus transparency**

We open-source not because "free is cool," but because **consensus algorithms require transparency by nature**.

Raft's paper says: Every node's log must be auditable. Then why shouldn't our code be auditable?

If you trust our code to host your project, you should have the right to audit our code.

**License Choice: MIT License (most permissive)**

Reason: Consensus algorithms shouldn't be limited by license propagation. Knowledge should flow freely.

**Philosophy:** _Monopolizing knowledge is betraying consensus._

---

### 8.2 Contributors First

**Traditional Model:** Core Team vs External Contributors
**Flotilla Model:** **Only Contributors, no distinction**

At Flotilla, we don't distinguish "internal developers" vs "external contributors":

- Your 1st PR merged → You're a **Contributor**
- Your 10th PR merged → System auto-invites you as **Reviewer**
- Your 50th PR merged → Community votes whether to grant **Maintainer** privileges

This isn't appointment—it's **dynamic consensus based on contribution**—just like Raft's Leader Election.

**Contributor Rights Protection:**

- Every Contributor's name permanently recorded in Git history (Immutable)
- Contributors graph auto-generated (based on Git log analysis)
- Major decisions (like License changes) require Majority Quorum (majority vote)

---

### 8.3 Design in the Open

**Traditional Model:** Internal discussion → Announce decision → Community executes
**Flotilla Model:** **All design discussions happen publicly in GitHub Issues**

We don't have "core team's private Slack channel." All architecture decisions discussed in GitHub Issues:

- Issue #1: Why choose NestJS over Express?
- Issue #42: Should Raft implementation use WebSocket or gRPC?
- Issue #127: Database index optimization strategy trade-offs

External contributors can participate in all discussions, raise objections, submit alternative proposals.

This isn't "soliciting feedback"—it's **genuine co-design**—just like Raft's Log Replication, every node has voting rights.

---

## Chapter 9: Collaboration in 2030

### 9.1 Scene 1: Morning Sync

**Time:** 9:00 AM Beijing (5:00 PM previous day San Francisco)

I open Flotilla. Notification Center shows 3 PRs awaiting review. No need to check Slack or refresh email—everything requiring my decision is here.

First PR from London team, submitted 6 hours ago. Review Summary already has 2 APPROVEDs, Merge Status shows all CI passed, Branch Protection requires 3 approvals. I'm the third.

I don't need to ask "What does this change affect?" because Code Search auto-analyzed dependencies, PR description auto-linked related Issue #234 and design docs.

I leave a line-level comment on line 47, suggesting algorithm complexity optimization. Click CHANGES_REQUESTED.

30 minutes later, the London developer wakes up, sees the notification, replies directly in the PR. We don't need a meeting, don't need to wait for "everyone's online" time window.

**Consensus happens naturally in async mode.**

---

### 9.2 Scene 2: Hotfix Under Pressure

**Time:** Production down, 2:00 AM

Production crashed. I open Flotilla from my phone, see Issue #567 auto-created (through Monitoring integration), Severity: CRITICAL.

3 team members simultaneously online (Beijing, Bangalore, Berlin). We don't need to shout "Who's here?" on Slack—Flotilla's real-time status shows who opened this Issue.

Bangalore colleague comments in Issue: "Suspected database connection pool exhaustion," pastes monitoring screenshot. I create Hotfix PR, reference Issue #567 in commit message, Branch Protection auto-downgrades (Emergency Mode), only needs 1 approval.

Berlin colleague reviews in 5 minutes, APPROVED + comment "LGTM, database logs also confirm connection pool issue." I click Merge, CI/CD auto-deploys, service restored.

**Entire process 15 minutes, not a single "Are you there?", not a single "Let's have an emergency meeting".**

---

### 9.3 Scene 3: Onboarding

**Time:** Intern's first day

I'm a new intern. My mentor assigned me first Issue #890: "Fix search result sorting issue."

I don't know where to start, but the Issue already has complete context:

- Link to design doc (why this sorting logic is needed)
- Link to related PR #234 (last similar issue fix)
- Link to test cases (expected behavior)
- Auto-generated code location (Code Search found the relevant TypeScript function)

I use Code Search to search `SortAlgorithm`, found similar code written by another intern 3 months ago, read his PR comments, learned the team's code style.

I submit PR, set Draft status. Mentor guides me line-by-line in the PR, no need to sit beside me, no need for remote desktop sharing.

**All guidance becomes knowledge deposition.**

Two weeks later, I can independently complete Issues, because I'm not "asking people"—I'm "querying the system."

---

### 9.4 Scene 4: Product Decision

**Time:** Feature Request discussion, cross-team collaboration

PM proposes new feature in Issue #1024: "Support multi-language code snippet syntax highlighting."

- Frontend team comments: "Monaco Editor supports it, but loading 100+ language packs will impact performance"
- Backend team comments: "MeiliSearch only indexes 4 languages, expansion needs Parser refactoring"
- DevOps comments: "Build time will increase 30%"

Debated for 3 days, 20 comments, but no one says "Let's have a meeting." Because all evidence is in the Issue:

- Frontend posted Monaco Editor Bundle Size analysis
- Backend posted Parser performance test data
- Product posted user research results (80% users only use JS/Python)

Finally, team lead summarizes in Issue: "Phase 1 support Top 4 languages only, Phase 2 load others on demand." Everyone thumbs up in agreement.

**This isn't compromise—it's evidence-based consensus.**

---

### 9.5 Scene 5: Open Source Contribution

**Time:** External contributor's first PR

I'm an external contributor wanting to submit a bug fix to Flotilla.

I don't know any Maintainers, but I know the process:

1. Fork repo
2. Create Issue describing the problem (auto-linked to related code)
3. Submit PR referencing Issue
4. Wait for Review

My PR gets reviewed by two Maintainers within 6 hours (one in Europe, one in Asia). They don't need to ask "Who are you?"—my code and test cases speak for themselves.

After PR merges, I automatically become part of the Contributors list. Next time I submit a PR, Review will be faster because the system recorded my contribution history.

**This isn't "knowing people helps"—it's "code quality decides everything."**

---

### 9.6 Vision Statement

**In 2030, when developers use Flotilla, they won't say "We're using a code hosting platform."**

**They'll say: "We're using a consensus machine."**

- No meetings needed—decisions happen naturally in Issues
- No documentation manager needed—docs and code in same repo
- No trust intermediary needed—Raft algorithm is the most impartial arbiter
- No memory needed—history is truth

**This is the future we're building: Collaboration as natural as breathing, consensus as certain as gravity.**

---

## Chapter 10: Join Us

### Fork the repo. Read the docs. Break things. Build consensus.

**GitHub Repository:** [github.com/CPU-JIA/Flotilla](https://github.com/CPU-JIA/Flotilla)

**Documentation Hub:** `/docs` directory

- [Requirements Analysis](./需求分析文档.md)
- [Architecture Design](./架构设计文档.md)
- [Database Design](./数据库设计文档.md)
- [Raft Consensus Algorithm Design](./分布式共识算法设计方案.md)
- [2025 Strategic Roadmap](./ROADMAP_2025.md)

**Contributing Guide:** [CONTRIBUTING.md](../CONTRIBUTING.md) (to be completed)

**License:** MIT License

**Community Principles:**

1. Code quality determines voice, not seniority
2. All design discussions transparent and public
3. Evidence-based decisions, not authority-based

---

**Welcome to the Flotilla fleet.**

**We don't just host code. We build consensus.**

---

**Version History:**

- v1.0.0 (2025-10-19): Initial release
- v2.0.0 (2025-10-28): Major content expansion, 8 new chapters, 5x word count

**Author:** JIA
**Reviewed by:** Flotilla Community
**License:** MIT

---

## Appendix: Usage Guidelines

### For README.md

Reference brand story in README.md:

```markdown
📖 **[Read Brand Story (EN)](./docs/BRAND_STORY_EN.md)** | **[阅读品牌故事](./docs/品牌故事_ZH.md)**
```

### For Marketing

Core value proposition (Elevator Pitch):

> **"Flotilla is the first code hosting platform to apply Raft consensus algorithm to team collaboration. We make distributed teams as reliable as distributed systems."**

Three Non-Negotiables:

1. Academic Rigor + Production Ready
2. Global by Design (i18n-first)
3. Developer First, Always

### For Pitches

**Opening:** "If Raft can achieve consensus among nodes, why can't teams?"

**Body:** ECP engineering principles + Production-grade Raft + Global-first

**Close:** "Collaboration should be as reliable as distributed systems. This isn't utopia. This is engineering."

---

**End of Document. Thank you for reading.**
