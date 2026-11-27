import {test} from 'node:test';
import assert from 'node:assert/strict';
import {resolveSanityEnvironment, assertNonProductionMutation} from './sanity-environment.ts';

const base = {SANITY_PROJECT_ID:'test123', SANITY_STUDIO_PROJECT_ID:'test123'};
test('local defaults to development, preview to staging, live website to production', () => {
  assert.equal(resolveSanityEnvironment(base).dataset,'development');
  assert.equal(resolveSanityEnvironment({...base,VERCEL_ENV:'preview'}).dataset,'staging');
  assert.equal(resolveSanityEnvironment({...base,VERCEL_ENV:'production'}).dataset,'production');
});
test('local and preview refuse a production dataset or conflicting aliases', () => {
  for (const env of [
    {...base,SANITY_DATASET:'production'},
    {...base,VERCEL_ENV:'preview',SANITY_DATASET:'production'},
    {...base,VERCEL_ENV:'preview',TEAM_ENV:'production'},
    {...base,TEAM_ENV:'staging',SANITY_DATASET:'staging',SANITY_API_DATASET:'production'},
    {...base,TEAM_ENV:'staging',SANITY_STUDIO_DATASET:'production'},
  ]) assert.throws(()=>resolveSanityEnvironment(env,true));
});
test('invalid environment, missing project, conflicting project and live-to-staging fail', () => {
  for (const env of [{},{...base,TEAM_ENV:'prod'},{...base,SANITY_API_PROJECT_ID:'other'},{...base,VERCEL_ENV:'production',TEAM_ENV:'staging'}]) {
    assert.throws(()=>resolveSanityEnvironment(env));
  }
});
test('production Studio needs an explicit gate; seeds still cannot target production', () => {
  const env={...base,TEAM_ENV:'production'};
  assert.throws(()=>resolveSanityEnvironment(env,true));
  const enabled={...env,SANITY_STUDIO_PRODUCTION_ACCESS:'1'};
  assert.equal(resolveSanityEnvironment(enabled,true).dataset,'production');
  assert.throws(()=>assertNonProductionMutation({projectId:'test123',dataset:'production'},enabled));
});
test('mutations accept only a matching development or staging client', () => {
  for(const dataset of ['development','staging']) {
    const env={...base,TEAM_ENV:dataset};
    assert.equal(assertNonProductionMutation({projectId:'test123',dataset},env).dataset,dataset);
    assert.throws(()=>assertNonProductionMutation({projectId:'other',dataset},env));
    assert.throws(()=>assertNonProductionMutation({projectId:'test123',dataset:'production'},env));
  }
});
test('bundled Studio uses only explicitly exposed variables and rejects conflicting environments', () => {
  const env={SANITY_STUDIO_PROJECT_ID:'test123',SANITY_STUDIO_ENVIRONMENT:'staging',SANITY_STUDIO_DATASET:'staging'};
  assert.equal(resolveSanityEnvironment(env,true).dataset,'staging');
  assert.throws(()=>resolveSanityEnvironment({...env,TEAM_ENV:'development'},true));
});
