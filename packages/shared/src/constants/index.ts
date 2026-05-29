// packages/shared/src/constants/index.ts

export const SOCKET_EVENTS = {
  // client → server
  JOIN_BOARD: "board:join",
  LEAVE_BOARD: "board:leave",
  ELEMENT_ADD: "element:add",
  ELEMENT_UPDATE: "element:update",
  ELEMENT_DELETE: "element:delete",
  CURSOR_MOVE: "cursor:move",

  // server → client
  BOARD_STATE: "board:state",
  ELEMENT_ADDED: "element:added",
  ELEMENT_UPDATED: "element:updated",
  ELEMENT_DELETED: "element:deleted",
  USER_JOINED: "user:joined",
  USER_LEFT: "user:left",
  CURSOR_UPDATED: "cursor:updated",
} as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER: 500,
} as const;
