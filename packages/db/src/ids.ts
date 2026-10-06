import { customAlphabet } from "nanoid";

const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

/** Публічний ідентифікатор сутності: 16 символів base62 (~95 біт) — короткий у посиланнях і не перебирається. */
export const newId = customAlphabet(alphabet, 16);

/** Токени, що мають бути секретними (посилання-запрошення, одноразові коди): 32 символи base62. */
export const newSecret = customAlphabet(alphabet, 32);
