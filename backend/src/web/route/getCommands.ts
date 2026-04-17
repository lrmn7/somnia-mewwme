import { Manager } from "../../manager.js";
import Fastify from "fastify";

export function getCommands(
  client: Manager,
  req: Fastify.FastifyRequest,
  res: Fastify.FastifyReply
) {
  client.logger.info("CommandRouterService", `${req.method} ${req.routeOptions.url} payload={}`);

  const grouped = new Map<string, Array<{ name: string; description: string }>>();

  client.commands.forEach((cmd) => {
    const name = `/${cmd.name.join(" ")}`;
    const category = cmd.category || "General";

    if (!grouped.has(category)) grouped.set(category, []);
    grouped.get(category)!.push({
      name,
      description: cmd.description,
    });
  });

  const result = Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([category, commands]) => ({
      category,
      commands: commands.sort((a, b) => a.name.localeCompare(b.name)),
    }));

  return res.send(result);
}
