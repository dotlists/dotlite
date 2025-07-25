import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
// import { api } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

export const listNumbers = query({
  // Validators for arguments.
  args: {
    count: v.number(),
  },

  // Query implementation.
  handler: async (ctx, args) => {
    const numbers = await ctx.db
      .query("numbers")
      .order("desc")
      .take(args.count);
    return {
      numbers: numbers.reverse().map((number) => number.value),
    };
  },
});

export const getUser = query({
  args: {},
  handler: async (ctx, _) => {
    const userId = await getAuthUserId(ctx);
    const user = userId === null ? null : await ctx.db.get(userId);
    return {
      viewer: user?.name ?? null,
      image: user?.image ?? null,
    };
  },
});

// You can write data to the database via a mutation:
export const addNumber = mutation({
  // Validators for arguments.
  args: {
    value: v.number(),
  },

  // Mutation implementation.
  handler: async (ctx, args) => {

    const id = await ctx.db.insert("numbers", { value: args.value });

    console.log("Added new document with id:", id);
    // Optionally, return a value from your mutation.
    // return id;
  },
});
