import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";

import { api } from "./_generated/api";
import { auth } from "./auth";
import { Id } from "./_generated/dataModel";

const http = httpRouter();

auth.addHttpRoutes(http);

http.route({
  path: "/ping",
  method: "GET",
  handler: httpAction(async () => {
    return new Response("pong", {
      status: 200,
      headers: {
        "Content-Type": "text/plain"
      }
    });
  }),
});

// /calendar/<userId> endpoint: generates ICS for user's tasks with due dates
http.route({
  path: "/calendar",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    const userId = req.url.split('?')[1];
    console.log(userId);
    // Get all lists for the user
    const lists = await ctx.runQuery(
      api.lists.getLists,
      { userId: userId as Id<"users"> }
    );
    const userLists = lists.filter(list => list.userId === userId);

    let allNodes: any[] = [];
    for (const list of userLists) {
      const nodes = await ctx.runQuery(api.lists.getNodes, { listId: list._id, userId: userId as Id<"users"> });
      allNodes = allNodes.concat(nodes);
    }

    // Only tasks with due dates
    const tasksWithDueDates = allNodes.filter(node => node.dueDate && node.state === "red");

    // Generate ICS events
    const events = tasksWithDueDates.map(node => {
      const lines = node.text.split("\n");
      const title = lines[0];
      const description = lines.slice(1).join("\n");
      const dt = node.dueDate; // RFC 3339 string

      // Format date for ICS (YYYYMMDD)
      const date = dt ? dt.split("T")[0].replace(/-/g, "") : "";

      return [
        "BEGIN:VEVENT",
        `UID:${node._id}@dotlist-lite`,
        `DTSTAMP:${date}T000000Z`,
        `DTSTART;VALUE=DATE:${date}`,
        `DTEND;VALUE=DATE:${date}`,
        `SUMMARY:${title}`,
        description ? `DESCRIPTION:${description}` : "",
        "END:VEVENT"
      ].filter(Boolean).join("\r\n");
    });

    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//dotlist-lite//EN",
      "NAME:Dotlist Lite Calendar",
      ...events,
      "END:VCALENDAR"
    ].join("\r\n");

    return new Response(ics, {
      status: 200,
      headers: {
        // "Content-Type": "text; charset=utf-8",
        // "Content-Disposition": `attachment; filename=\"tasks-${userId}.ics\"`
      }
    });
  }),
});

export default http;
