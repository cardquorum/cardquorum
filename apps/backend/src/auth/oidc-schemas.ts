import { z } from 'zod';

/**
 * Shape of an OIDC discovery document.
 *
 * This data arrives from a remote identity provider and decides where tokens are
 * sent and where JWT signing keys are fetched. It must never be trusted unvalidated.
 */
export const OidcDiscoverySchema = z.object({
  issuer: z.string().min(1),
  authorization_endpoint: z.url(),
  token_endpoint: z.url(),
  jwks_uri: z.url(),
  end_session_endpoint: z.url().optional(),
});

export type OidcDiscovery = z.infer<typeof OidcDiscoverySchema>;

/** Shape of the OIDC token-exchange response. Only `id_token` is consumed. */
export const OidcTokenResponseSchema = z.object({
  id_token: z.string().min(1),
});

export type OidcTokenResponse = z.infer<typeof OidcTokenResponseSchema>;
