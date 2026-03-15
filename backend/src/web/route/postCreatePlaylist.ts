import { Manager } from "../../manager.js";
import Fastify from "fastify";
// @ts-ignore — voucher-code-generator has no types
import voucher from "voucher-code-generator";

/**
 * POST /v1/playlists
 *
 * Creates a new playlist for a user.
 * Body: { userId, name, description?, private? }
 */
export async function postCreatePlaylist(
  client: Manager,
  req: Fastify.FastifyRequest,
  res: Fastify.FastifyReply
) {
  const body = req.body as Record<string, any>;
  const { userId, name, description = null, private: isPrivate = false } = body;

  if (!userId || !name) {
    res.code(400).send({ error: "userId and name are required." });
    return;
  }
  if (name.length > 32) {
    res.code(400).send({ error: "Name must be 32 characters or fewer." });
    return;
  }

  const all = (await (client.db.playlist as any).all()) as any[];
  const userPlaylists = all.filter((e: any) => e.value?.owner === userId);
  if (userPlaylists.length >= client.config.features.LIMIT_PLAYLIST) {
    res
      .code(400)
      .send({ error: `Playlist limit reached (${client.config.features.LIMIT_PLAYLIST}).` });
    return;
  }

  const id: string =
    "pl-" + voucher.generate({ length: 8, count: 1, charset: voucher.charset("alphanumeric") })[0];

  await client.db.playlist.set(id, {
    id,
    name,
    owner: userId,
    private: Boolean(isPrivate),
    created: Date.now(),
    description: description ?? null,
    tracks: [],
  });

  res
    .code(201)
    .send({
      id,
      name,
      owner: userId,
      private: Boolean(isPrivate),
      created: Date.now(),
      description,
      tracks: [],
    });
}
