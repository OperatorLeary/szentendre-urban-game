export const APP_ERROR_CODES = {
  runCreateFailed: "RUN_CREATE_FAILED",
  activeRunAlreadyExistsForDevice: "ACTIVE_RUN_ALREADY_EXISTS_FOR_DEVICE",
  activeRunConflictOtherRoute: "ACTIVE_RUN_CONFLICT_OTHER_ROUTE",
  playerAliasBlockedContent: "PLAYER_ALIAS_BLOCKED_CONTENT",
  playerAliasLinkOrContact: "PLAYER_ALIAS_LINK_OR_CONTACT",
  playerAliasInvalidLength: "PLAYER_ALIAS_INVALID_LENGTH",
} as const;

export type AppErrorCode =
  (typeof APP_ERROR_CODES)[keyof typeof APP_ERROR_CODES];
