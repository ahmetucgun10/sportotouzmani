import { pgTable, serial, text, timestamp, jsonb, integer, varchar } from "drizzle-orm/pg-core";

export const matchAnalyses = pgTable("match_analyses", {
  id: serial("id").primaryKey(),
  homeTeam: varchar("home_team", { length: 255 }).notNull(),
  awayTeam: varchar("away_team", { length: 255 }).notNull(),
  matchDate: varchar("match_date", { length: 100 }),
  league: varchar("league", { length: 255 }),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  agentLogs: jsonb("agent_logs").default([]),
  finalPrediction: text("final_prediction"),
  homeTeamData: jsonb("home_team_data"),
  awayTeamData: jsonb("away_team_data"),
  headToHead: jsonb("head_to_head"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const agentLogs = pgTable("agent_logs", {
  id: serial("id").primaryKey(),
  analysisId: integer("analysis_id").references(() => matchAnalyses.id),
  agentName: varchar("agent_name", { length: 100 }).notNull(),
  agentEmoji: varchar("agent_emoji", { length: 10 }),
  step: varchar("step", { length: 255 }),
  content: text("content"),
  sources: jsonb("sources").default([]),
  status: varchar("status", { length: 50 }).default("running"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
