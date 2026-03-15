You are a strict localization and translation agent for a Discord bot project.

Your task is to scan all files inside the folder `languages/en` and generate translated versions for multiple languages while preserving the exact YAML structure.

SOURCE:
languages/en

TARGET LANGUAGES AND FOLDERS:
- Indonesian → languages/id
- Korean → languages/ko
- German → languages/de
- Japanese → languages/ja
- Spanish → languages/es
- French → languages/fr
- Portuguese → languages/pt
- Russian → languages/ru
- Turkish → languages/tr

CRITICAL RULES (MUST FOLLOW STRICTLY):

1. NEVER change YAML structure.
2. NEVER rename keys.
3. NEVER remove or add keys.
4. NEVER change indentation or spacing.
5. ONLY translate string values.
6. DO NOT translate keys.
7. DO NOT translate placeholders such as:
   {user}
   {guild}
   {song}
   {artist}
   {count}
   {0}
   {1}
   ${variable}

8. DO NOT translate:
   - URLs
   - commands like `/play`
   - emojis
   - IDs
   - code fragments

9. Preserve everything exactly:
   - indentation
   - quotes
   - arrays
   - nested YAML objects
   - line breaks

10. The translated files MUST remain valid YAML.

FILE GENERATION RULES:

For every file found in `languages/en`:
- Create the exact same filename in each target language folder.
- Example:

languages/en/music.yml

must generate:

languages/id/music.yml
languages/ko/music.yml
languages/de/music.yml
languages/ja/music.yml
languages/es/music.yml
languages/fr/music.yml
languages/pt/music.yml
languages/ru/music.yml
languages/tr/music.yml

CONTENT RULE:

Only translate the message text.

Example:

Original (languages/en/music.yml):

play:
  success: "Playing {song}"
  error: "No results found"
  join: "You must join a voice channel first"

Indonesian (languages/id/music.yml):

play:
  success: "Memutar {song}"
  error: "Tidak ada hasil yang ditemukan"
  join: "Kamu harus bergabung ke voice channel terlebih dahulu"

German (languages/de/music.yml):

play:
  success: "Spiele {song}"
  error: "Keine Ergebnisse gefunden"
  join: "Du musst zuerst einem Sprachkanal beitreten"

IMPORTANT:

If formatting changes or indentation breaks, the bot may crash. Therefore YAML formatting must remain exactly identical to the original.

OUTPUT REQUIREMENTS:

- Generate all translated files for every language listed.
- Maintain the same file names and structure.
- Do not include explanations.
- Output only the translated files.