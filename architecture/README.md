# Enterprise Travel Architecture

This repository is an enterprise-scale LikeC4 architecture-as-code workspace for a large financial services enterprise with Travel as the first modeled domain.

It is designed to grow to many domains, dozens of Travel applications, hundreds of components, and thousands of integrations without creating a single unmaintainable model file.

## Repository Hierarchy

```text
architecture/
├── likec4.config.json
├── specification/
│   ├── model.c4
│   ├── element-kinds.c4
│   ├── relationships.c4
│   ├── styles.c4
│   └── tags.c4
├── enterprise/
├── travel/
├── external/
└── views/
```

LikeC4 merges all `.c4` files into one model. Files are split by ownership, not by diagram.

## Modeling Hierarchy

| Concept | LikeC4 mapping | Example |
| --- | --- | --- |
| Enterprise | `organization` | `amex` |
| Domain | `domain` | `amex.travel`, `amex.identity` |
| Subdomain / capability | `capability` | `amex.travel.backendPlatforms.booking` |
| System / platform | `travelSystem`, `enterpriseSystem` | `amex.travel.backendPlatforms.booking.platform` |
| Application | `travelApplication`, `webApplication`, `mobileApplication` | `amex.travel.customerExperience.web` |
| Component | `api`, `service`, `microservice`, `partnerAdapter` | `amex.travel.backendPlatforms.booking.platform.api` |
| Infrastructure | `apiGateway`, `loadBalancer`, `eventStream`, `cache`, `database` | `amex.data.kafka` |
| Partner | `externalPartner` | `external.partners.iseatz` |
| Vendor | `technologyVendor`, `monitoringPlatform`, `loggingPlatform` | `external.vendors.dynatrace` |

Use `extend <fully.qualified.name>` to add systems or components owned by a team.

## Visual Standard

Color represents ownership. Shape represents responsibility or technology role.

| Category | Color token | Intended palette | Shape/icon meaning |
| --- | --- | --- | --- |
| Travel-owned | `travelOwned` | pale green | system, app, service, database, cache, adapter |
| Enterprise shared | `enterpriseOwned` | deep blue | enterprise platform or enterprise component |
| External partner | `partnerOwned` | purple | travel business partner |
| Technology vendor | `vendorOwned` | slate gray | SaaS/tool/vendor |
| Boundary | `neutralBoundary`, `travelBoundary`, `enterpriseBoundary`, `externalBoundary` | subtle tints | organizational scope |

LikeC4 custom colors are base colors. The renderer derives fill, border, and text contrast from those base values.

## Element Kinds

Shared kinds live in `specification/element-kinds.c4`. Teams must reuse them instead of adding local notation.

Common technical kinds include `apiGateway`, `loadBalancer`, `api`, `service`, `microservice`, `partnerAdapter`, `database`, `cache`, `messageQueue`, `eventStream`, `objectStorage`, `dataPipeline`, `monitoringPlatform`, and `loggingPlatform`.

## Relationship Styles

Relationship kinds live in `specification/relationships.c4`.

Use titles for business actions and the `technology` property for protocol/mechanism:

```c4
amex.travel.backendPlatforms.booking.platform .restApi amex.identity.platform 'Authenticate customer' {
  technology 'OAuth2 / OIDC'
}
```

Preferred conventions:

| Kind | Meaning |
| --- | --- |
| `restApi`, `http`, `graphql`, `grpc` | synchronous interaction |
| `async`, `queue` | asynchronous messaging |
| `event`, `stream` | event streaming |
| `batch`, `fileTransfer`, `sftp` | batch/file movement |
| `database` | data store access |
| `vendorIntegration` | vendor or partner integration |

## View Hierarchy

| Level | View type | Rule |
| --- | --- | --- |
| 0 | Enterprise landscape | domains only; no Travel applications |
| 1 | Travel domain context | capabilities and major external dependencies |
| 2 | Travel application landscape | Travel applications grouped by capability |
| 3 | Application context | one application/platform plus upstream/downstream dependencies |
| 4 | Component architecture | components inside one system boundary |
| 5 | Integration flow | one use case across systems/domains/partners |

Starter views include `enterprise_landscape`, `travel_domain_context`, `travel_application_landscape`, `travel_enterprise_dependencies`, `travel_partner_ecosystem`, `travel_booking_context`, `travel_booking_components`, `travel_booking_flow`, and `travel_observability`.

## Naming Standards

LikeC4 local identifiers cannot contain dots. Dots appear only in fully qualified names created by nesting.

Use lower camel case for identifiers:

```c4
amex.travel.backendPlatforms.booking.platform
amex.travel.backendPlatforms.booking.platform.reservationService
external.partners.iseatz
external.vendors.dynatrace
```

Use readable display titles separately:

```c4
platform = travelSystem 'Booking Platform'
```

## Metadata

Use LikeC4 `metadata` for queryable ownership and governance fields:

```c4
metadata {
  owner 'Travel Booking'
  criticality 'Tier-1'
  dataClassification 'Confidential / PCI'
  lifecycle 'Strategic'
  repository 'travel-booking-platform'
}
```

Recommended keys: `owner`, `criticality`, `dataClassification`, `lifecycle`, `repository`, `techStack`.

## Adding New Model Content

Add a new Travel application under `travel/<capability>/systems.c4`, define it once, add relationships in `relationships.c4`, and create a view only when it answers a clear architecture question.

Enterprise dependencies belong under `enterprise/<domain>/`. Travel teams reference them by FQN and do not redefine them locally.

Travel business partners belong under `external/partners/` and use `externalPartner`. Technology vendors belong under `external/vendors/` and use `technologyVendor`, `monitoringPlatform`, or `loggingPlatform`.

Partner internals should normally stay outside the model. The exception is iSeatz LXP, where selected internals are modeled because they define the Amex control handoff, Amex connector surface, supplier routing, booking events, and reporting integration.

## What Not To Model

- Do not put application components in enterprise landscape views.
- Do not create one diagram containing all Travel applications, all partners, and all enterprise dependencies.
- Do not duplicate system definitions inside views.
- Do not create arbitrary team-specific colors.
- Do not model partner/vendor internals unless the integration contract requires it.
- Do not show unrelated enterprise systems in application context views.

Aim for 20-30 primary nodes per curated view.

## Contribution Governance

Application teams own their capability-local `systems.c4`, `components.c4`, `relationships.c4`, and `views.c4` files.

Enterprise Architecture owns `specification/`, enterprise-level views, naming conventions, visual standards, and governance.

Pull requests should include LikeC4 validation results, the architecture question answered by any new view, and owner/criticality/lifecycle/data classification metadata for new systems. New domains, element kinds, colors, or cross-enterprise dependencies require Enterprise Architecture review.

Suggested CI:

```yaml
name: validate-likec4
on: [pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npx likec4 validate --no-layout architecture
```

## Validate Locally

```sh
npm run architecture:validate
```

## Static Site

Build the static LikeC4 site for all views:

```sh
npm run architecture:build
```

The generated site is written to:

```text
architecture/dist/
```

Serve the existing static site:

```sh
npm run architecture:serve
```

Build, serve, watch source files, and auto-refresh connected browsers:

```sh
npm run architecture:watch
```

Default local URL:

```text
http://127.0.0.1:5173/
```

Direct US Air online booking flow:

```text
http://127.0.0.1:5173/#/view/travel_online_us_air_booking_flow/
```
