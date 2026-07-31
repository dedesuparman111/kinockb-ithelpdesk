export const USERNAME_DOMAIN = "kino-helpdesk.local";
export const usernameToEmail = (username: string) =>
  `${username.trim().toLowerCase()}@${USERNAME_DOMAIN}`;
