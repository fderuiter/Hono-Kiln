# [1.28.0](https://github.com/fderuiter/Hono-Kiln/compare/v1.27.1...v1.28.0) (2026-07-15)


## Features

* **auth:** fallback to Bearer token authentication ([#101](https://github.com/fderuiter/Hono-Kiln/issues/101)) ([c575355](https://github.com/fderuiter/Hono-Kiln/commit/c575355876a4eeda8572644f79b6c8b7a8a46a9f))

# [1.27.1](https://github.com/fderuiter/Hono-Kiln/compare/v1.27.0...v1.27.1) (2026-07-15)


## Performance Improvements

* **a11y:** optimize Swagger UI validation polling via debouncing ([#100](https://github.com/fderuiter/Hono-Kiln/issues/100)) ([03622be](https://github.com/fderuiter/Hono-Kiln/commit/03622bea7207ffa57e8916a00f32b5dcb3d3fd69))

# [1.27.0](https://github.com/fderuiter/Hono-Kiln/compare/v1.26.0...v1.27.0) (2026-07-15)


## Bug Fixes

* **a11y:** enhance swagger-ui accessibility ([467593f](https://github.com/fderuiter/Hono-Kiln/commit/467593f4efed280712c162001a07d7bdceae52af))
* **schema:** synchronize migrations with schema ([0a2d10f](https://github.com/fderuiter/Hono-Kiln/commit/0a2d10f815c752a6218094250c9c460deb46c2b9))


## Features

* Add database schema verification to preflight check ([9e961a1](https://github.com/fderuiter/Hono-Kiln/commit/9e961a15a4f93e646a5f393c0b1f8da3514de6e5))

# [1.26.0](https://github.com/fderuiter/Hono-Kiln/compare/v1.25.0...v1.26.0) (2026-07-15)


## Bug Fixes

* **docs:** resolve syntax error in accessibility script ([75bb283](https://github.com/fderuiter/Hono-Kiln/commit/75bb2834c3682b0994caa21d5009839cf52f41d8))
* **setup:** target module registry and schema for boilerplate cleanup ([ed82456](https://github.com/fderuiter/Hono-Kiln/commit/ed82456b2a45ac5b83de93258b9867c50d58be4a))


## Features

* **ci:** add jscpd duplicate code detection to PR validation ([6b90799](https://github.com/fderuiter/Hono-Kiln/commit/6b9079968620b40998844e87355d936befed0eb0))

# [1.25.0](https://github.com/fderuiter/Hono-Kiln/compare/v1.24.1...v1.25.0) (2026-07-14)


## Bug Fixes

* **a11y:** static patching of main.js to avoid flaky CI and ignore nested-interactive ([3644ab6](https://github.com/fderuiter/Hono-Kiln/commit/3644ab624275b3ee88c5280d44949320bd2519b6))
* **docs:** apply accessibility enhancements to sidebar links ([1cb09f5](https://github.com/fderuiter/Hono-Kiln/commit/1cb09f5483b5a223b08ec5bbed3c468108776fa2))
* **swagger-ui:** render custom a11y styles after external stylesheets ([34b5a8c](https://github.com/fderuiter/Hono-Kiln/commit/34b5a8c03a647985af6733827a1252b1936a65bf))


## Features

* add standalone Makefile target for inngest runner ([3f4052d](https://github.com/fderuiter/Hono-Kiln/commit/3f4052df5daabbe8836092fe694067dc42f730c2))

# [1.24.1](https://github.com/fderuiter/Hono-Kiln/compare/v1.24.0...v1.24.1) (2026-07-14)


## Bug Fixes

* **docker:** add missing sdk package to build context ([0236008](https://github.com/fderuiter/Hono-Kiln/commit/0236008e42e430002dd81449a62de7b3e205053c))

# [1.24.0](https://github.com/fderuiter/Hono-Kiln/compare/v1.23.0...v1.24.0) (2026-07-13)


## Bug Fixes

* **api:** add missing database drivers to dependencies ([f303205](https://github.com/fderuiter/Hono-Kiln/commit/f303205ae7009935760cfc768818e01f374d58ff))


## Features

* Abstract database driver behind provider factory ([a1a16a2](https://github.com/fderuiter/Hono-Kiln/commit/a1a16a2a46de9b2eb352f3fe3472d54644829900))

# [1.23.0](https://github.com/fderuiter/Hono-Kiln/compare/v1.22.0...v1.23.0) (2026-07-13)


## Features

* standardise v1 sub-app architecture ([1a9d2de](https://github.com/fderuiter/Hono-Kiln/commit/1a9d2de156a86ba4db1d6c860a4249e653e66485))

# [1.22.0](https://github.com/fderuiter/Hono-Kiln/compare/v1.21.0...v1.22.0) (2026-07-13)


## Features

* migrate a11y styles to variable-driven system ([85f3186](https://github.com/fderuiter/Hono-Kiln/commit/85f3186cda2b6c13084872c32c9c39aa1402fbf7))

# [1.21.0](https://github.com/fderuiter/Hono-Kiln/compare/v1.20.0...v1.21.0) (2026-07-13)


## Bug Fixes

* **ci:** fix knip unused files and typedoc audit errors ([acf05d1](https://github.com/fderuiter/Hono-Kiln/commit/acf05d1a1f121c80a1586a49e60ff542726d12d0))


## Features

* implement safe result SDK client with functional interceptors and test helpers ([8c4ab6d](https://github.com/fderuiter/Hono-Kiln/commit/8c4ab6da4aaf5297684b34de19b9a6e2393c381a))

# [1.20.0](https://github.com/fderuiter/Hono-Kiln/compare/v1.19.0...v1.20.0) (2026-07-09)


## Features

* Decouple route registry and introduce typed SDK package ([085acc1](https://github.com/fderuiter/Hono-Kiln/commit/085acc126804747b03a640385865f75e97c03738))

# [1.19.0](https://github.com/fderuiter/Hono-Kiln/compare/v1.18.0...v1.19.0) (2026-07-02)


## Features

* unified api application architecture to include business routes in docs ([33d4efa](https://github.com/fderuiter/Hono-Kiln/commit/33d4efad5ece5369f88e0e898a220c61d4fc50b2))

# [1.18.0](https://github.com/fderuiter/Hono-Kiln/compare/v1.17.0...v1.18.0) (2026-07-02)


## Features

* **cloudflare:** implement full-lifecycle credential validation ([e9262ff](https://github.com/fderuiter/Hono-Kiln/commit/e9262fffd2006d9853661a7dae3458903240f1a8))

# [1.17.0](https://github.com/fderuiter/Hono-Kiln/compare/v1.16.0...v1.17.0) (2026-07-02)


## Bug Fixes

* **ci:** fix a11y scan server race condition and capture errors ([2127c8e](https://github.com/fderuiter/Hono-Kiln/commit/2127c8ec47e144c6d266ee9c7985974014526a09))
* **ci:** sanitize dynamic paths in CLI output snapshots ([40b7210](https://github.com/fderuiter/Hono-Kiln/commit/40b7210c695f6d556fbc3232e6805df0e628dc5a))


## Features

* **api:** add validated repository factory ([cace74c](https://github.com/fderuiter/Hono-Kiln/commit/cace74cde047f5815ba42d1154fb2872fc6ef641))

# [1.16.0](https://github.com/fderuiter/Hono-Kiln/compare/v1.15.0...v1.16.0) (2026-07-02)


## Bug Fixes

* **a11y:** restore native focus outline on Swagger UI container ([44cb449](https://github.com/fderuiter/Hono-Kiln/commit/44cb4495a04faf631b85477e874594bda3e577a9))
* **ci:** make schema sync generation deterministic ([e1421cd](https://github.com/fderuiter/Hono-Kiln/commit/e1421cd8afdebe80787c4c7e5511422344134cb0))
* **ci:** Resolve knip and typedoc audit failures by exporting public API variables and adding JSDoc comments ([b50f0e9](https://github.com/fderuiter/Hono-Kiln/commit/b50f0e99ea33c493e7175401827035981dc6085b))


## Features

* Add production Docker setup for Bun API ([571617f](https://github.com/fderuiter/Hono-Kiln/commit/571617ff452861b3703cf8d5e296a21c73412edb))
* **ci:** unify PR-level accessibility verification for architecture docs ([75f8e67](https://github.com/fderuiter/Hono-Kiln/commit/75f8e67344ecce688f6a1ee642a9e9ff3ec9706c))
* enhance API documentation orientation UX for keyboard users ([4893625](https://github.com/fderuiter/Hono-Kiln/commit/4893625153c501984ce0fb12c95f61275df5511f)), closes [hi#contrast](https://github.com/hi/issues/contrast) [#swagger-ui](https://github.com/fderuiter/Hono-Kiln/issues/swagger-ui)
* Enterprise Permission Engine ([634a2b5](https://github.com/fderuiter/Hono-Kiln/commit/634a2b5c9b450a930318c20c98a7432019cabf05))
* optimize production startup and bypass dev preflight checks ([9e81b23](https://github.com/fderuiter/Hono-Kiln/commit/9e81b23e924037c71b80cc6921e4418f7e521664))

# [1.15.0](https://github.com/fderuiter/Hono-Kiln/compare/v1.14.0...v1.15.0) (2026-07-02)


## Bug Fixes

* resolve duplicate export and unused imports for CI ([f02c3cc](https://github.com/fderuiter/Hono-Kiln/commit/f02c3ccacdb15f9c71019aede38d045f7ba302e5))


## Features

* implement multi-tenancy foundation and scaffolding support ([7b3b6db](https://github.com/fderuiter/Hono-Kiln/commit/7b3b6db83db8610452b13e2874be126b954fc798))

# [1.14.0](https://github.com/fderuiter/Hono-Kiln/compare/v1.13.0...v1.14.0) (2026-07-02)


## Features

* implement robust sequential setup with active health polling ([54aebcd](https://github.com/fderuiter/Hono-Kiln/commit/54aebcdfa976a4c327ac0dc8b9d1331f03242cb9))

# [1.13.0](https://github.com/fderuiter/Hono-Kiln/compare/v1.12.0...v1.13.0) (2026-07-02)


## Bug Fixes

* ci validations (knip ignored binaries and oxlint warnings) ([f6612ef](https://github.com/fderuiter/Hono-Kiln/commit/f6612efba839c235483667fd14328e428f97be1b))


## Features

* automated distributed infrastructure & observability ([b04a418](https://github.com/fderuiter/Hono-Kiln/commit/b04a4185b923a387e6019d976466a6b6b25cae08))
* implement zero-touch cloud onboarding ([2eb91dd](https://github.com/fderuiter/Hono-Kiln/commit/2eb91ddad16034303786baf296f93637ba0357d5))
* secure-by-default scaffolding ([7f21e43](https://github.com/fderuiter/Hono-Kiln/commit/7f21e4350cbeda7b3b56a9857291fffba058df9e))

# [1.12.0](https://github.com/fderuiter/Hono-Kiln/compare/v1.11.0...v1.12.0) (2026-07-02)


## Features

* Add Interactive Onboarding Choice for Lite and Full environments ([86e5546](https://github.com/fderuiter/Hono-Kiln/commit/86e554621f819bae22b8d675dd7d8cc92c225dd0))

# [1.11.0](https://github.com/fderuiter/Hono-Kiln/compare/v1.10.0...v1.11.0) (2026-07-01)


## Features

* Add developer migration squash utility ([4e600b7](https://github.com/fderuiter/Hono-Kiln/commit/4e600b7b0d21adf2769c3eb0aee4d6d4ba7fb51f))

# [1.10.0](https://github.com/fderuiter/Hono-Kiln/compare/v1.9.0...v1.10.0) (2026-07-01)


## Bug Fixes

* skip sync-schema script in temp test environments ([a7528f3](https://github.com/fderuiter/Hono-Kiln/commit/a7528f31b141bd7c782e41102aafb5023b8f4933))


## Features

* **a11y:** implement automated accessibility compliance framework ([ec0f284](https://github.com/fderuiter/Hono-Kiln/commit/ec0f28481fb81c9b1926d41b156019201a1d6c8a))
* automate zero-config schema discovery ([e2e4c06](https://github.com/fderuiter/Hono-Kiln/commit/e2e4c060977a603341b9e3dca4a2b937b22186d5))
* Implement unified environment guardrails ([c4fc9d0](https://github.com/fderuiter/Hono-Kiln/commit/c4fc9d0cbe9617310be31113d1fffca70d805646))

# [1.9.0](https://github.com/fderuiter/Hono-Kiln/compare/v1.8.0...v1.9.0) (2026-07-01)


## Features

* **api:** implement comprehensive status announcement system for swagger-ui ([bed6f3d](https://github.com/fderuiter/Hono-Kiln/commit/bed6f3de566bfc285f219b414138a385a25ad353))
* Centralized localization middleware and dynamic swagger docs locale ([903e9ea](https://github.com/fderuiter/Hono-Kiln/commit/903e9ea3f909734703a5cd5e7494e9ea1ef5662d))
* implement robust AST-based module registration ([a6ec566](https://github.com/fderuiter/Hono-Kiln/commit/a6ec56650e40af4fac8157f544d40940709f2098))
* implement standardized domain orchestration layer ([11b2d9b](https://github.com/fderuiter/Hono-Kiln/commit/11b2d9b404bea62fc7c39776ab16dde05a34111c))

# [1.8.0](https://github.com/fderuiter/Hono-Kiln/compare/v1.7.0...v1.8.0) (2026-07-01)


## Features

* **api:** Implement infrastructure isolation ([4bf6ca6](https://github.com/fderuiter/Hono-Kiln/commit/4bf6ca65d8b646b7220744e50c640f5041e22203))

# [1.7.0](https://github.com/fderuiter/Hono-Kiln/compare/v1.6.0...v1.7.0) (2026-07-01)


## Features

* implement architectural reference portal and documentation validation ([#50](https://github.com/fderuiter/Hono-Kiln/issues/50)) ([1076de1](https://github.com/fderuiter/Hono-Kiln/commit/1076de11d6494df0c893570d6b5f65a0fba76a89))

# [1.6.0](https://github.com/fderuiter/Hono-Kiln/compare/v1.5.0...v1.6.0) (2026-07-01)


## Features

* **api:** add interactive pre-flight startup checks ([ee80220](https://github.com/fderuiter/Hono-Kiln/commit/ee80220aef1f912c2245b0a2e6b52b8820edd738))
* migrate CLI interactions to @clack/prompts for screen reader accessibility ([6cc8a25](https://github.com/fderuiter/Hono-Kiln/commit/6cc8a25f6b92abbb2f9e2364ead145c7f896eb46))

# [1.5.0](https://github.com/fderuiter/Hono-Kiln/compare/v1.4.0...v1.5.0) (2026-07-01)


## Bug Fixes

* add shared workspace dependency to api ([0b50813](https://github.com/fderuiter/Hono-Kiln/commit/0b5081307fdce1d55d2d184dc3f03d586b3b714f))
* **ci:** correct invalid secrets conditional and restore test jobs ([ddcf7cf](https://github.com/fderuiter/Hono-Kiln/commit/ddcf7cf1b1aa16327f4fb51180329ebae3a36797))
* **ci:** restore conditionals to avoid billing issue ([8e7c79f](https://github.com/fderuiter/Hono-Kiln/commit/8e7c79fa3e155c294bde460856106ab5fc5a0742))
* **ci:** skip jobs to avoid billing issues ([536f193](https://github.com/fderuiter/Hono-Kiln/commit/536f19377d7ac7b8af2fbc06c52450a60f3f6e86))
* **cli:** prefix unused db parameter with underscore in template ([caaa192](https://github.com/fderuiter/Hono-Kiln/commit/caaa192752caf417e26586a5ec5047d84bd333bb))
* correct oxlint command and remove if: false ([906116b](https://github.com/fderuiter/Hono-Kiln/commit/906116b33b4ffc8a3e60279518590364bc0cd0ab))
* **docs:** add valid HTML structure and assertions for Swagger UI ([77a1624](https://github.com/fderuiter/Hono-Kiln/commit/77a1624eade3155f7e752a2784b901f40e409e5c))
* **lint:** remove unused Lucia import from auth middleware ([a3ee6fd](https://github.com/fderuiter/Hono-Kiln/commit/a3ee6fd14fe7df7c55484b06deace00f3383a849))
* resolve linter and knip errors ([0002f72](https://github.com/fderuiter/Hono-Kiln/commit/0002f7209e3e9831e9acf4610b573b26e603dd0c))
* skip checks on PR to avoid billing issue ([51bf47a](https://github.com/fderuiter/Hono-Kiln/commit/51bf47af6c4a789e31beb967810038da32c83f32))
* **typing:** resolve type inference issues in Hono routes and middleware ([7cdaa69](https://github.com/fderuiter/Hono-Kiln/commit/7cdaa690310d454c1fcf49a57b533cf6b32d73e5))


## Features

* Add interactive metadata scaffolding for modules ([f8b8d0f](https://github.com/fderuiter/Hono-Kiln/commit/f8b8d0fc5091ac1f0b8cc7288f2f9932749a63bd))
* add semantic body template with skip-link and main landmark for a11y ([a4183b8](https://github.com/fderuiter/Hono-Kiln/commit/a4183b8cfcebd73d118ac100ef26a4cc062ccd43))
* Add zero-config interactive bootstrapper setup script ([1de4c0f](https://github.com/fderuiter/Hono-Kiln/commit/1de4c0f9f2c14519853362d052b4bb192cf97f9c))
* **api:** unified schema factory ([10e7aea](https://github.com/fderuiter/Hono-Kiln/commit/10e7aea863515e6379024425ac12292c8dbd0478))
* Automate module removal and expand audit coverage ([d69c204](https://github.com/fderuiter/Hono-Kiln/commit/d69c20465cab46210312515dd5e48427f8b0d0b3))
* extract shared domain utilities for hashing and session management ([b1ebef1](https://github.com/fderuiter/Hono-Kiln/commit/b1ebef17da478f23a864d76f98170276263ca267))
* implement global application guard ([074bac0](https://github.com/fderuiter/Hono-Kiln/commit/074bac03608f6071b05dfa326015bf7b0dfc53f7))
* implement unified test harness ([80ec90f](https://github.com/fderuiter/Hono-Kiln/commit/80ec90f7a4d6672b0568fb64fb136e9e2edd6533))
* isolate utility routes from database dependencies ([77a0464](https://github.com/fderuiter/Hono-Kiln/commit/77a0464b9e6a893b9965c618a0ea199423563a1b))
* **kiln:** integrate knip for workspace health audits ([76a1fea](https://github.com/fderuiter/Hono-Kiln/commit/76a1feabf08e47b6560ec506d3ebe0f39b578db5))
* migrate CI architecture to use reusable workflows ([7e6bb52](https://github.com/fderuiter/Hono-Kiln/commit/7e6bb522ba7d38ddc20bde2e2d774dcb349882d0))
* standard schemas and scaffolding enrichment ([5b2cdf0](https://github.com/fderuiter/Hono-Kiln/commit/5b2cdf011bff09c4ddc4a96f01df17cdf1f580e8))
* standardize worker config ([5dbbcef](https://github.com/fderuiter/Hono-Kiln/commit/5dbbcef7690b983d5b0a9a780aacc66fa56174ff))

# [1.4.0](https://github.com/fderuiter/Hono-Kiln/compare/v1.3.0...v1.4.0) (2026-05-14)


### Features

* add db-seed script with dummy user creation ([bff64e3](https://github.com/fderuiter/Hono-Kiln/commit/bff64e369c9d5d5df99e4150315b519b06872e9d))

# [1.3.0](https://github.com/fderuiter/Hono-Kiln/compare/v1.2.0...v1.3.0) (2026-05-14)


### Features

* implement auth register, login, and logout endpoints ([2707267](https://github.com/fderuiter/Hono-Kiln/commit/2707267f250b9d89064afa66daf4cfc519d3258b))

# [1.2.0](https://github.com/fderuiter/Hono-Kiln/compare/v1.1.0...v1.2.0) (2026-05-13)


### Features

* **cli:** upgrade kiln cli to output openapi routes ([5057255](https://github.com/fderuiter/Hono-Kiln/commit/50572550e9c9ec24d3a0ad31826a461fd7dfb357))

# [1.1.0](https://github.com/fderuiter/Hono-Kiln/compare/v1.0.0...v1.1.0) (2026-05-13)


### Features

* integrate @hono/zod-openapi and @hono/swagger-ui, rewrite README ([f44d968](https://github.com/fderuiter/Hono-Kiln/commit/f44d968048d867b47b24cf480696f40aa9fb7771))

# 1.0.0 (2026-05-13)


### Bug Fixes

* harden import insertion and generator tests ([6ba1fcb](https://github.com/fderuiter/Hono-Kiln/commit/6ba1fcb2a2170dea8b8cce48ad7a46b52dc9f7b8))
* resolve TruffleHog --fail duplication, add Bun setup to preview workflow, document secrets in README ([143642c](https://github.com/fderuiter/Hono-Kiln/commit/143642ce4a32309766bc5c39bb1493f83e911e41))
* skip wrangler deploy/remove jobs when Cloudflare secrets are absent ([9fa2daa](https://github.com/fderuiter/Hono-Kiln/commit/9fa2daabc22f2d92d75e288a54b4bb1b005be9f2))


### Features

* add kiln module scaffolder and devcontainer config ([7e1fba1](https://github.com/fderuiter/Hono-Kiln/commit/7e1fba1969dab4cd6f47eef402857fa05da43e7f))
* add local libsql and drizzle setup ([03a25e9](https://github.com/fderuiter/Hono-Kiln/commit/03a25e9f6d5cfe590e2b5b16a084569d9b1b2378))
* add modular routing and lucia auth middleware ([e095a7c](https://github.com/fderuiter/Hono-Kiln/commit/e095a7c178215ef43713435f18087d100ff25d81))
* initialize bun workspaces and base hono api ([5d24243](https://github.com/fderuiter/Hono-Kiln/commit/5d2424358321feb64e7e1e20c464922a69d1ac7c))
