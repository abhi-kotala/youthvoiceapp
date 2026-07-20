import { defineMcp } from "@lovable.dev/mcp-js";
import listIssues from "./tools/list-issues";
import getIssue from "./tools/get-issue";
import listComments from "./tools/list-comments";

export default defineMcp({
  name: "youth-voice-mcp",
  title: "Youth Voice",
  version: "0.1.0",
  instructions:
    "Public MCP server for Youth Voice, a civic polling and debate app for under-18 residents of Fargo, West Fargo, and Moorhead. Use list_issues to browse current civic topics, get_issue to fetch one issue with its poll tallies, and list_comments to read the debate thread on an issue. All data returned is already public on the site.",
  tools: [listIssues, getIssue, listComments],
});
