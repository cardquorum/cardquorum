import { OidcDiscoverySchema, OidcTokenResponseSchema } from './oidc-schemas';

describe('OidcDiscoverySchema', () => {
  const valid = {
    issuer: 'https://idp.example.com',
    authorization_endpoint: 'https://idp.example.com/authorize',
    token_endpoint: 'https://idp.example.com/token',
    jwks_uri: 'https://idp.example.com/jwks',
  };

  it('accepts a well-formed discovery document', () => {
    expect(OidcDiscoverySchema.parse(valid)).toMatchObject(valid);
  });

  it('accepts an optional end_session_endpoint', () => {
    const withLogout = { ...valid, end_session_endpoint: 'https://idp.example.com/logout' };
    expect(OidcDiscoverySchema.parse(withLogout).end_session_endpoint).toBe(
      'https://idp.example.com/logout',
    );
  });

  it('rejects a document missing jwks_uri', () => {
    const { jwks_uri: _omitted, ...missing } = valid;
    expect(() => OidcDiscoverySchema.parse(missing)).toThrow();
  });

  it('rejects a non-URL token_endpoint', () => {
    expect(() => OidcDiscoverySchema.parse({ ...valid, token_endpoint: 'not-a-url' })).toThrow();
  });

  it('rejects a null body', () => {
    expect(() => OidcDiscoverySchema.parse(null)).toThrow();
  });
});

describe('OidcTokenResponseSchema', () => {
  it('accepts a response carrying an id_token', () => {
    expect(OidcTokenResponseSchema.parse({ id_token: 'abc.def.ghi' }).id_token).toBe('abc.def.ghi');
  });

  it('rejects a response with no id_token', () => {
    expect(() => OidcTokenResponseSchema.parse({ access_token: 'abc' })).toThrow();
  });

  it('rejects an empty id_token', () => {
    expect(() => OidcTokenResponseSchema.parse({ id_token: '' })).toThrow();
  });
});
