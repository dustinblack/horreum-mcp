# Auto-load agent context

on_session_start:
  - read_file: "$HOME/AGENTS.md"
  - read_file: "./AGENTS.md"

# Notes:
# - $HOME resolves to the user home, ensuring ~/AGENTS.md is read.
# - ./AGENTS.md refers to the repo-local file.
# - This rule ensures both files are ingested at the beginning of each session.
