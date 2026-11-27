# Sanity environment safeguards

This setup branch changes local configuration; it does not prove hosted isolation. Do not merge until the release owner configures the production Studio build variables below and reviews the existing staging visual-editing branch. No content was copied, published, seeded or migrated during setup.

| Context | TEAM_ENV | Dataset | Studio host |
|---|---|---|---|
| Local development | development | development | local; reserved deploy name muzmesh-development |
| Vercel preview / staging | staging | staging | reserved deploy name muzmesh-staging |
| Existing production | production | production | muzmesh |

The proposed dataset names must be verified or provisioned before use. The connected Sanity account cannot list `gly807qe` because the organization is outside its OAuth scope. Reauthorize the connector for that organization; check its dataset allowance and costs before creating anything. No purchase or hosted mutation is authorized by this file.

## Local configuration

Copy the example files into ignored `.env` files in each app and enter the actual non-production project ID. The resolver defaults to development, validates all dataset aliases and refuses mismatches. Both Studio configuration and CLI use it. Production Studio access additionally requires `SANITY_STUDIO_PRODUCTION_ACCESS=1`; this is an accident-prevention gate, not permission enforcement.

The web client maps Vercel `preview` to staging and `production` to production; otherwise it defaults to development. Explicit TEAM_ENV and aliases must agree with the deployment context. Studio browser builds additionally require SANITY_STUDIO_ENVIRONMENT to match the chosen target because Sanity exposes only individual SANITY_STUDIO_* values. Build-time production reads remain allowed; the website is a reader. If a private dataset is used, provide a read-only build token through server-side environment variables only, never SANITY_STUDIO_* or PUBLIC_* variables.

`npm run migrate` and `npm run seed:home` validate the actual client project/dataset before any writes. Production is rejected even when the Studio access gate is enabled. Intentional production migrations require a separate reviewed release procedure, backup and explicit authorization; no bypass is shipped here.

## Hosted setup, after access is fixed

1. List existing datasets and inspect plan allowances. Reuse matching development/staging datasets if safe. If creation would incur charges, stop for the owner's decision. Prefer a separate non-production project when the plan cannot restrict developers/tokens by dataset; do not assume an Editor token is dataset-scoped.
2. Use synthetic data. Do not clone client production data or assets without an explicit sanitization decision. Test helpers must never reuse production user tokens.
3. Verify each person's effective roles and all additive permissions. Limit developers and agents to non-production writes. Keep the release owner's production credentials outside agent-accessible environments. Public/private visibility is not write authorization.
4. Configure Vercel Preview with TEAM_ENV=staging and matching SANITY_DATASET/SANITY_API_DATASET. Configure Production with TEAM_ENV=production and production dataset. The web build also bundles Studio: its build must receive matching SANITY_STUDIO_PROJECT_ID, SANITY_STUDIO_ENVIRONMENT, SANITY_STUDIO_DATASET and, for production only, SANITY_STUDIO_PRODUCTION_ACCESS=1. Do not set that flag globally in local shells. Verify env loading for the nested Studio build before release.
5. Register only exact non-production CORS origins needed; no wildcard credentials. Separate webhook targets: development and staging must never trigger the existing main/production deploy hook. Do not expose deploy hook URLs.
6. Review the existing staging branch's Presentation/publish actions. It currently reads production by default; a "Publish to staging" label is not dataset isolation. Port the resolver and mutation checks without overwriting its UI changes.
7. In non-production, test edit/publish and preview readback, verify the effective role denies production writes through a controlled access test, and record target IDs and outcomes. Do not issue a production mutation to test the rule during this setup.
8. Release owner approves the PR, configures protections, verifies staging, then authorizes a production release separately. Do not merge this branch while build variables are missing.

## Verification

Run from the repository root:

```sh
node --experimental-strip-types --test scripts/sanity-environment.test.ts
```

These tests use fake project IDs and make no network requests. They check local/preview defaults, conflicting dataset/project aliases, production Studio gating and seed/migration target rejection. They do not validate hosted roles, datasets, webhooks, CORS, builds or deployment routing.

References: [Sanity environments](https://www.sanity.io/docs/content-lake/environments), [Studio environment variables](https://www.sanity.io/docs/studio/environment-variables).
