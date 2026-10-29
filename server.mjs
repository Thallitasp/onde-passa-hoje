import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const ROOT = dirname(fileURLToPath(import.meta.url));
const TIME_ZONE = "America/Sao_Paulo";
const CACHE_TTL_MS = 120_000;
const BROADCAST_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const BROADCAST_RETRY_TTL_MS = 15 * 60 * 1000;
const GE_PREVIEW_CACHE_TTL_MS = 30 * 60 * 1000;
const GE_ARTICLE_CACHE_TTL_MS = 60 * 60 * 1000;
const GE_PREVIEW_RETRY_TTL_MS = 10 * 60 * 1000;
const GE_AGENDA_URL = "https://ge.globo.com/agenda/#/futebol";
const GE_AGENDA_PAGE_URL = "https://ge.globo.com/agenda/";
const CBF_BROADCASTS_API = "https://www.cbf.com.br/api/cbf/onde-assistir/jogos";
const CBF_BROADCASTS_PAGE = "https://www.cbf.com.br/futebol-brasileiro/onde-assistir";
const execFileAsync = promisify(execFile);
const cache = new Map();
const broadcastCache = new Map();
const geArticleCache = new Map();
const gePreviewCache = new Map();
let geAgendaCache = null;

function loadDotEnv() {
  try {
    const content = readFileSync(join(ROOT, ".env"), "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separator = trimmed.indexOf("=");
      if (separator < 1) continue;
      const key = trimmed.slice(0, separator).trim();
      let value = trimmed.slice(separator + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (key && process.env[key] === undefined) process.env[key] = value;
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}
loadDotEnv();

function sendJson(response, status, body) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(body));
}
function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
  const date = new Date(value + "T00:00:00.000Z");
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
function shiftDate(value, offset) {
  const date = new Date(value + "T00:00:00.000Z");
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}
function localDate(utcDate) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date(utcDate));
  const values = {};
  for (const part of parts) if (part.type !== "literal") values[part.type] = part.value;
  return values.year + "-" + values.month + "-" + values.day;
}
function localTime(utcDate) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(new Date(utcDate));
  const values = {};
  for (const part of parts) if (part.type !== "literal") values[part.type] = part.value;
  return values.hour + ":" + values.minute;
}
function asText(value, fallback) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}
function normalizeTeamName(value) {
  const normalized = String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/\b(saf|futebol clube|clube de futebol|fc|ec|sc)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
  const aliases = {
    "athletico pr": "athletico paranaense",
    "red bull bragantino": "bragantino",
    "rb bragantino": "bragantino",
    "atletico mg": "atletico mineiro",
    "ca mineiro": "atletico mineiro",
    "america mg": "america mineiro",
    "atletico go": "atletico goianiense",
    "atletico clube goianiense": "atletico goianiense",
    "botafogo fr": "botafogo",
    "botafogo de futebol e regatas": "botafogo",
    "corinthians paulista": "corinthians",
    "club athletico paranaense": "athletico paranaense",
    "clube atletico mineiro": "atletico mineiro",
    "club atletico mineiro": "atletico mineiro",
    "clube de regatas vasco da gama": "vasco da gama",
    "club de regatas vasco da gama": "vasco da gama",
    "clube de regatas flamengo": "flamengo",
    "club de regatas flamengo": "flamengo",
    "gremio foot ball porto alegrense": "gremio",
    "sociedade esportiva palmeiras": "palmeiras",
    "se palmeiras": "palmeiras",
    "sport club internacional": "internacional",
    "sport club do recife": "sport",
    "fortaleza esporte clube": "fortaleza",
    "coritiba foot ball club": "coritiba",
    "fluminense football club": "fluminense",
    "frosinone calcio": "frosinone",
    "us lecce": "lecce",
    "acf fiorentina": "fiorentina",
    "atalanta bc": "atalanta",
    "internazionale milano": "internazionale",
    "parma calcio 1913": "parma",
    "udinese calcio": "udinese",
    "bologna 1909": "bologna",
    "ac monza": "monza",
    "ssc napoli": "napoli",
    "genoa cfc": "genoa",
    "ac milan": "milan",
    "sport recife": "sport",
    "cr vasco da gama": "vasco da gama",
    "cr flamengo": "flamengo",
    "gremio fbpa": "gremio",
    "ca paranaense": "athletico paranaense",
    "vasco": "vasco da gama",
    "botafogo rj": "botafogo"
  };
  return aliases[normalized] || normalized;
}
function isoDateFromCbf(value) {
  const match = typeof value === "string" && value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  return match[3] + "-" + match[2] + "-" + match[1];
}
function cbfDateUrl(base, date) {
  const url = new URL(base);
  url.searchParams.set("dataInicio", date);
  url.searchParams.set("dataTermino", date);
  return url.toString();
}
function normalizeCbfGames(games) {
  return games.map((game) => {
    const homeName = asText(game?.mandante?.nome, "Mandante a confirmar");
    const awayName = asText(game?.visitante?.nome, "Visitante a confirmar");
    const competitionName = asText(game?.competicao?.campeonato_nome, "Competição a confirmar");
    const categoryName = asText(game?.competicao?.categoria_nome, "");
    const id = Number(game?.id_jogo);
    return {
      id: Number.isSafeInteger(id) && id > 0 ? id : null,
      date: isoDateFromCbf(game?.data),
      time: typeof game?.hora === "string" ? game.hora.slice(0, 5) : "",
      home: normalizeTeamName(homeName),
      away: normalizeTeamName(awayName),
      homeTeam: {
        id: Number.isInteger(Number(game?.mandante?.id)) ? Number(game.mandante.id) : null,
        name: homeName,
        shortName: homeName,
        crest: safeCbfCrest(game?.mandante?.url_escudo)
      },
      awayTeam: {
        id: Number.isInteger(Number(game?.visitante?.id)) ? Number(game.visitante.id) : null,
        name: awayName,
        shortName: awayName,
        crest: safeCbfCrest(game?.visitante?.url_escudo)
      },
      venue: typeof game?.local === "string" && game.local.trim() ? game.local.trim() : null,
      competition: {
        code: "CBF-" + asText(game?.competicao?.campeonato_id, "unknown") + "-" + asText(game?.competicao?.categoria_id, "unknown"),
        name: categoryName ? competitionName + " · " + categoryName : competitionName
      },
      homeScore: scoreValue(game?.mandante?.gols),
      awayScore: scoreValue(game?.visitante?.gols),
      channels: Array.isArray(game?.transmissoes)
        ? [...new Set(game.transmissoes.map((item) => asText(item?.nome, "")).filter(Boolean))]
        : []
    };
  }).filter((game) => game.id && game.date && game.home && game.away && /^\d{2}:\d{2}$/.test(game.time));
}
function safeCbfCrest(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "conteudo.cbf.com.br") return null;
    return url.toString();
  } catch {
    return null;
  }
}
function scoreValue(value) {
  if (value === null || value === undefined || value === "") return null;
  const score = Number(value);
  return Number.isInteger(score) && score >= 0 ? score : null;
}
function saoPauloDateTimeToUtc(date, time) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const approximateUtc = Date.UTC(year, month - 1, day, hour, minute);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(new Date(approximateUtc));
  const values = {};
  for (const part of parts) if (part.type !== "literal") values[part.type] = part.value;
  const localAtApproximateUtc = Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day), Number(values.hour), Number(values.minute));
  const offset = localAtApproximateUtc - approximateUtc;
  return new Date(approximateUtc - offset).toISOString();
}
function matchesFromCbf(feed) {
  const now = Date.now();
  return feed.games.map((game) => {
    const utcDate = saoPauloDateTimeToUtc(game.date, game.time);
    const fullTime = { home: game.homeScore, away: game.awayScore };
    const hasScore = fullTime.home !== null && fullTime.away !== null;
    const winner = !hasScore ? null : fullTime.home === fullTime.away ? "DRAW" : fullTime.home > fullTime.away ? "HOME_TEAM" : "AWAY_TEAM";
    return {
      id: game.id,
      utcDate,
      status: new Date(utcDate).getTime() > now ? "SCHEDULED" : "UNKNOWN",
      minute: null,
      venue: game.venue,
      competition: game.competition,
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam,
      goals: [],
      broadcast: {
        channels: game.channels,
        status: game.channels.length > 0 ? "confirmed" : "unconfirmed",
        source: "CBF",
        sourceUrl: feed.sourceUrl,
        checkedAt: feed.checkedAt,
        stale: feed.stale
      },
      score: { winner, fullTime }
    };
  }).sort((a, b) => a.utcDate.localeCompare(b.utcDate));
}
function matchesFromGe(feed) {
  return feed.games.map((game) => ({
    id: game.id,
    utcDate: saoPauloDateTimeToUtc(game.date, game.time),
    status: game.status,
    minute: null,
    venue: game.venue || null,
    competition: game.competition,
    homeTeam: game.homeTeam,
    awayTeam: game.awayTeam,
    goals: [],
    broadcast: {
      channels: game.channels,
      status: game.channels.length > 0 ? "confirmed" : "unconfirmed",
      source: game.channels.length > 0 ? "GE" : null,
      sourceUrl: game.sourceUrl,
      checkedAt: feed.checkedAt,
      stale: feed.stale
    },
    score: game.score
  })).sort((a, b) => a.utcDate.localeCompare(b.utcDate));
}
function enrichGeMatchesWithFootballData(geMatches, footballDataPayload) {
  return geMatches.map((geMatch) => {
    const date = localDate(geMatch.utcDate);
    const time = localTime(geMatch.utcDate);
    const candidates = footballDataPayload.matches.filter((match) =>
      localDate(match.utcDate) === date && localTime(match.utcDate) === time &&
      normalizeTeamName(match.homeTeam.name) === normalizeTeamName(geMatch.homeTeam.name) &&
      normalizeTeamName(match.awayTeam.name) === normalizeTeamName(geMatch.awayTeam.name)
    );
    if (candidates.length !== 1) return geMatch;

    const dataMatch = candidates[0];
    const dataHomeScore = scoreValue(dataMatch.score.fullTime.home);
    const dataAwayScore = scoreValue(dataMatch.score.fullTime.away);
    const goals = dataMatch.goals.map((goal) => ({
      ...goal,
      teamId: goal.teamId === dataMatch.homeTeam.id ? geMatch.homeTeam.id
        : goal.teamId === dataMatch.awayTeam.id ? geMatch.awayTeam.id
          : null
    }));
    return {
      ...geMatch,
      status: dataMatch.status && dataMatch.status !== "UNKNOWN" ? dataMatch.status : geMatch.status,
      minute: dataMatch.minute ?? geMatch.minute,
      goals,
      score: {
        winner: dataMatch.score.winner || geMatch.score.winner,
        fullTime: {
          home: dataHomeScore ?? geMatch.score.fullTime.home,
          away: dataAwayScore ?? geMatch.score.fullTime.away
        }
      }
    };
  });
}
async function cbfBroadcastsFor(date) {
  const cached = broadcastCache.get(date);
  const now = Date.now();
  if (cached?.payload.available && now - cached.savedAt < BROADCAST_CACHE_TTL_MS) return cached.payload;
  if (cached?.failedAt && now - cached.failedAt < BROADCAST_RETRY_TTL_MS) return cached.payload;

  const sourceUrl = cbfDateUrl(CBF_BROADCASTS_PAGE, date);
  try {
    const requestUrl = cbfDateUrl(CBF_BROADCASTS_API, date);
    let body;
    try {
      const response = await fetch(requestUrl, {
        headers: {
          Accept: "application/json",
          "User-Agent": "OndePassaHoje/0.2.0"
        },
        signal: AbortSignal.timeout(8_000)
      });
      if (!response.ok) throw new Error("HTTP " + response.status);
      body = await response.json();
    } catch (error) {
      const certificateError = [
        "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
        "UNABLE_TO_GET_ISSUER_CERT_LOCALLY",
        "CERT_HAS_EXPIRED"
      ].includes(error?.cause?.code);
      if (process.platform !== "win32" || !certificateError) throw error;

      const script = "$ProgressPreference='SilentlyContinue';$ErrorActionPreference='Stop';(Invoke-RestMethod -Uri '" + requestUrl + "' -TimeoutSec 8 -Headers @{Accept='application/json'})|ConvertTo-Json -Depth 30 -Compress";
      const { stdout } = await execFileAsync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], {
        windowsHide: true,
        timeout: 10_000,
        maxBuffer: 2 * 1024 * 1024,
        encoding: "utf8"
      });
      try {
        body = JSON.parse(stdout.trim());
      } catch {
        throw new Error("A CBF retornou uma resposta inválida no Windows.");
      }
    }
    if (!Array.isArray(body.jogos)) throw new Error("resposta sem lista de jogos");
    const payload = {
      available: true,
      stale: false,
      checkedAt: new Date().toISOString(),
      sourceUrl,
      games: normalizeCbfGames(body.jogos)
    };
    broadcastCache.set(date, { savedAt: now, payload });
    return payload;
  } catch (error) {
    const payload = cached?.payload.available
      ? { ...cached.payload, stale: true }
      : { available: false, stale: false, checkedAt: null, sourceUrl, games: [] };
    broadcastCache.set(date, { savedAt: cached?.savedAt || 0, failedAt: now, payload });
    console.warn("[CBF] Não foi possível atualizar as transmissões: " + (error.message || "erro de conexão"));
    return payload;
  }
}
function extractBalancedObject(source, openIndex) {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = openIndex; index < source.length; index++) {
    const character = source[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') inString = false;
    } else if (character === '"') {
      inString = true;
    } else if (character === "{") {
      depth++;
    } else if (character === "}" && --depth === 0) {
      return source.slice(openIndex, index + 1);
    }
  }
  throw new Error("A agenda do ge contém um objeto incompleto.");
}
function parseGeSchedule(html) {
  const assignmentIndex = html.indexOf("window.dataSportsSchedule");
  if (assignmentIndex < 0) throw new Error("A agenda do ge não trouxe os dados esperados.");
  const property = /\bsport\s*:\s*\{/.exec(html.slice(assignmentIndex));
  if (!property) throw new Error("A agenda do ge não trouxe a programação de futebol.");
  const openIndex = assignmentIndex + property.index + property[0].lastIndexOf("{");
  return JSON.parse(extractBalancedObject(html, openIndex));
}
function safeGeUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "ge.globo.com") return null;
    return url.toString();
  } catch {
    return null;
  }
}
function safeGeCrest(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "s.sde.globo.com") return null;
    return url.toString();
  } catch {
    return null;
  }
}
function geStatus(moment, scoreboard) {
  if (moment === "FUTURE") return "SCHEDULED";
  if (moment === "NOW") return "IN_PLAY";
  if (moment === "PAST") {
    return scoreValue(scoreboard?.home) !== null && scoreValue(scoreboard?.away) !== null ? "FINISHED" : "UNKNOWN";
  }
  return "UNKNOWN";
}
function geWinner(result, homeScore, awayScore) {
  if (result === "FIRST_TEAM") return "HOME_TEAM";
  if (result === "SECOND_TEAM") return "AWAY_TEAM";
  if (result === "DRAW") return "DRAW";
  if (homeScore === null || awayScore === null) return null;
  return homeScore === awayScore ? "DRAW" : homeScore > awayScore ? "HOME_TEAM" : "AWAY_TEAM";
}
function normalizeGeGames(schedule, date) {
  const agenda = schedule?.[date]?.championshipsAgenda;
  if (!Array.isArray(agenda)) return [];
  return agenda.flatMap((championship) => ["future", "now", "past"].flatMap((period) => {
    const events = championship?.[period];
    return Array.isArray(events) ? events.map((event) => ({ event, championship })) : [];
  })).map(({ event, championship }) => {
    const match = event?.match;
    const homeSource = match?.firstContestant;
    const awaySource = match?.secondContestant;
    const homeName = asText(homeSource?.popularName, asText(homeSource?.name, ""));
    const awayName = asText(awaySource?.popularName, asText(awaySource?.name, ""));
    const rawTime = asText(match?.startHour, "");
    const competitionName = asText(championship?.championship?.name, "Competição a confirmar");
    const homeScore = scoreValue(match?.scoreboard?.home);
    const awayScore = scoreValue(match?.scoreboard?.away);
    const channels = Array.isArray(match?.liveWatchSources)
      ? [...new Map(match.liveWatchSources
        .map((source) => asText(source?.name, ""))
        .filter((name) => name && !/cartola/i.test(name))
        .map((name) => [name.toLocaleLowerCase("pt-BR"), name])).values()]
      : [];
    return {
      id: Number.isSafeInteger(Number(match?.id)) ? Number(match.id) : null,
      date: typeof match?.startDate === "string" && validDate(match.startDate) ? match.startDate : null,
      time: /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(rawTime) ? rawTime.slice(0, 5) : "",
      home: normalizeTeamName(homeName),
      away: normalizeTeamName(awayName),
      competition: {
        code: "GE-" + normalizeTeamName(competitionName).replace(/\s+/g, "-"),
        name: competitionName
      },
      venue: asText(match?.location?.popularName, ""),
      status: geStatus(asText(match?.moment, asText(event?.moment, "")), match?.scoreboard),
      homeTeam: {
        id: Number.isSafeInteger(Number(homeSource?.id)) ? Number(homeSource.id) : null,
        name: homeName,
        shortName: homeName,
        crest: safeGeCrest(homeSource?.badgePng) || safeGeCrest(homeSource?.badgeSvg)
      },
      awayTeam: {
        id: Number.isSafeInteger(Number(awaySource?.id)) ? Number(awaySource.id) : null,
        name: awayName,
        shortName: awayName,
        crest: safeGeCrest(awaySource?.badgePng) || safeGeCrest(awaySource?.badgeSvg)
      },
      score: {
        winner: geWinner(match?.result, homeScore, awayScore),
        fullTime: { home: homeScore, away: awayScore }
      },
      channels,
      sourceUrl: safeGeUrl(match?.transmission?.url) || GE_AGENDA_URL
    };
  }).filter((game) => game.id && game.date === date && game.home && game.away && /^\d{2}:\d{2}$/.test(game.time));
}
async function fetchGeHtml(url) {
  const requestUrl = safeGeUrl(url);
  if (!requestUrl) throw new Error("A URL de conteúdo do ge não é válida.");
  try {
    const response = await fetch(requestUrl, {
      headers: { Accept: "text/html", "User-Agent": "OndePassaHoje/0.2.0" },
      signal: AbortSignal.timeout(12_000)
    });
    if (!response.ok) {
      const error = new Error("HTTP " + response.status);
      error.status = response.status;
      throw error;
    }
    const contentLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > 8 * 1024 * 1024) throw new Error("A página do ge excede o limite de leitura.");
    const html = await response.text();
    if (html.length > 8 * 1024 * 1024) throw new Error("A página do ge excede o limite de leitura.");
    return html;
  } catch (error) {
    const certificateError = [
      "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
      "UNABLE_TO_GET_ISSUER_CERT_LOCALLY",
      "CERT_HAS_EXPIRED"
    ].includes(error?.cause?.code);
    if (process.platform !== "win32" || !certificateError) throw error;

    const powershellUrl = requestUrl.replace(/'/g, "''");
    const script = "$ProgressPreference='SilentlyContinue';$ErrorActionPreference='Stop';$r=Invoke-WebRequest -Uri '" + powershellUrl + "' -TimeoutSec 12 -Headers @{Accept='text/html'};[Console]::Write($r.Content)";
    const { stdout } = await execFileAsync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], {
      windowsHide: true,
      timeout: 15_000,
      maxBuffer: 8 * 1024 * 1024,
      encoding: "utf8"
    });
    return stdout;
  }
}
async function fetchGeAgendaHtml() {
  return fetchGeHtml(GE_AGENDA_PAGE_URL);
}
async function geBroadcastsFor(date) {
  const now = Date.now();
  const cached = geAgendaCache;
  if (cached?.schedule && now - cached.savedAt < BROADCAST_CACHE_TTL_MS) {
    return {
      available: true,
      stale: false,
      checkedAt: cached.checkedAt,
      sourceUrl: GE_AGENDA_URL,
      games: normalizeGeGames(cached.schedule, date)
    };
  }
  if (cached?.failedAt && now - cached.failedAt < BROADCAST_RETRY_TTL_MS) {
    return cached.schedule
      ? { available: true, stale: true, checkedAt: cached.checkedAt, sourceUrl: GE_AGENDA_URL, games: normalizeGeGames(cached.schedule, date) }
      : { available: false, stale: false, checkedAt: null, sourceUrl: GE_AGENDA_URL, games: [] };
  }

  try {
    const schedule = parseGeSchedule(await fetchGeAgendaHtml());
    const payload = {
      available: true,
      stale: false,
      checkedAt: new Date().toISOString(),
      sourceUrl: GE_AGENDA_URL,
      games: normalizeGeGames(schedule, date)
    };
    geAgendaCache = { savedAt: now, failedAt: 0, checkedAt: payload.checkedAt, schedule };
    return payload;
  } catch (error) {
    geAgendaCache = { ...(cached || {}), failedAt: now };
    console.warn("[ge] Não foi possível atualizar a agenda: " + (error.message || "erro de conexão"));
    return cached?.schedule
      ? { available: true, stale: true, checkedAt: cached.checkedAt, sourceUrl: GE_AGENDA_URL, games: normalizeGeGames(cached.schedule, date) }
      : { available: false, stale: false, checkedAt: null, sourceUrl: GE_AGENDA_URL, games: [] };
  }
}
function decodeHtmlEntities(value) {
  return String(value || "")
    .replace(/&#(\d+);?/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);?/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&");
}
function htmlToText(value) {
  return decodeHtmlEntities(value)
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|li|blockquote|h[1-6]|div|section|ul|ol)\s*>/gi, "\n")
    .replace(/<li\b[^>]*>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/[\t\f\v ]+/g, " ")
    .replace(/[ \t]*\n[ \t]*/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}
function htmlAttribute(tag, name) {
  const match = tag.match(new RegExp("(?:^|\\s)" + name + "\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s>]+))", "i"));
  return decodeHtmlEntities(match?.[1] ?? match?.[2] ?? match?.[3] ?? "");
}
function geMetaValue(html, key) {
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = match[0];
    const name = htmlAttribute(tag, "property") || htmlAttribute(tag, "name") || htmlAttribute(tag, "itemprop");
    if (name.toLowerCase() === key.toLowerCase()) return htmlAttribute(tag, "content");
  }
  return "";
}
function extractHtmlElement(html, tagName, startIndex) {
  const token = new RegExp("<\\/?" + tagName + "\\b[^>]*>", "gi");
  token.lastIndex = startIndex;
  let depth = 0;
  let contentStart = -1;
  let match;
  while ((match = token.exec(html))) {
    const closing = /^<\//.test(match[0]);
    const selfClosing = /\/>$/.test(match[0]);
    if (!closing) {
      if (depth === 0) contentStart = token.lastIndex;
      if (!selfClosing) depth++;
    } else if (depth > 0) {
      depth--;
      if (depth === 0) return html.slice(contentStart, match.index);
    }
  }
  return "";
}
function geArticleBody(html) {
  const article = /<article\b(?=[^>]*\bitemprop=["']articleBody["'])[^>]*>/i.exec(html);
  return article ? extractHtmlElement(html, "article", article.index) : "";
}
function slugifyGe(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
function geMatchPreviewUrl(match) {
  const matchPageUrl = safeGeUrl(match?.transmission?.url);
  if (!matchPageUrl) return null;
  const page = new URL(matchPageUrl);
  const route = /^(.*)\/jogo\/\d{2}-\d{2}-\d{4}\/[^/]+$/i.exec(page.pathname);
  const date = match?.startDate;
  const home = asText(match?.firstContestant?.popularName, asText(match?.firstContestant?.name, ""));
  const away = asText(match?.secondContestant?.popularName, asText(match?.secondContestant?.name, ""));
  if (!route || !validDate(date) || !home || !away) return null;
  const [year, month, day] = date.split("-");
  const slug = slugifyGe(home) + "-x-" + slugifyGe(away) + "-onde-assistir-ao-vivo-horario-e-escalacoes.ghtml";
  return new URL(route[1] + "/noticia/" + year + "/" + month + "/" + day + "/" + slug, page.origin).toString();
}
function geRoundPreviewUrls(date, championship, match) {
  const competition = asText(championship?.championship?.name, "");
  const round = Number(match?.round);
  if (!/brasileiro/i.test(competition) || /feminino|sub-\d/i.test(competition) || !Number.isInteger(round) || round < 1) return [];
  const year = date.slice(0, 4);
  const slug = "cartola-" + year + "-veja-suspensos-lesionados-e-escalacoes-provaveis-da-rodada-" + round + "-do-brasileirao.ghtml";
  return [-1, 0, -2, -3].map((offset) => {
    const [publishYear, month, day] = shiftDate(date, offset).split("-");
    return "https://ge.globo.com/cartola/noticia/" + publishYear + "/" + month + "/" + day + "/" + slug;
  });
}
function findGeEvent(schedule, date, id) {
  const agenda = schedule?.[date]?.championshipsAgenda;
  if (!Array.isArray(agenda)) return null;
  for (const championship of agenda) {
    for (const period of ["future", "now", "past"]) {
      const events = championship?.[period];
      if (!Array.isArray(events)) continue;
      const event = events.find((candidate) => Number(candidate?.match?.id) === Number(id));
      if (event) return { event, championship };
    }
  }
  return null;
}
function cleanPreviewField(value) {
  const cleaned = htmlToText(value).replace(/\s+/g, " ").trim();
  if (!cleaned) return null;
  if (/^[-–—]$/.test(cleaned)) return "Nenhum listado pelo ge.";
  return cleaned;
}
function extractLabeledField(text, label) {
  const labels = "Suspensos?|Lesionados?|Time provável|Quem está fora|Pendurados|Arbitragem";
  const start = new RegExp("(?:^|\\s)" + label + "\\s*:\\s*", "i").exec(text);
  if (!start) return null;
  const valueStart = start.index + start[0].length;
  const remainder = text.slice(valueStart);
  const next = new RegExp("\\s+(?:" + labels + ")\\s*:", "i").exec(remainder);
  return cleanPreviewField(next ? remainder.slice(0, next.index) : remainder);
}
function classifyReportedAbsences(value) {
  const groups = String(value || "").split(/\s*;\s*/).filter(Boolean);
  const classified = { suspended: [], injured: [], other: [] };
  for (const group of groups) {
    if (/suspens/i.test(group)) classified.suspended.push(group);
    else if (/(les[aã]o|fratur|contus|dores?|trauma|recupera|cirurg|desconforto|edema|inflama)/i.test(group)) classified.injured.push(group);
    else classified.other.push(group);
  }
  return {
    suspended: classified.suspended.length ? cleanPreviewField(classified.suspended.join("; ")) : null,
    injured: classified.injured.length ? cleanPreviewField(classified.injured.join("; ")) : null,
    otherAbsences: classified.other.length ? cleanPreviewField(classified.other.join("; ")) : null
  };
}
function previewTeamInfo(text, sectionHtml, team) {
  const quote = /<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/i.exec(sectionHtml || "");
  const quoteText = quote ? htmlToText(quote[1]) : "";
  const lineup = extractLabeledField(quoteText, "Time provável") || extractLabeledField(text, "Time provável");
  let suspended = extractLabeledField(text, "Suspensos?");
  let injured = extractLabeledField(text, "Lesionados?");
  let otherAbsences = null;
  const reported = extractLabeledField(text, "Quem está fora");
  if (reported) {
    const classified = classifyReportedAbsences(reported);
    suspended ||= classified.suspended;
    injured ||= classified.injured;
    otherAbsences = classified.otherAbsences;
  }
  return {
    teamId: Number.isSafeInteger(Number(team?.id)) ? Number(team.id) : null,
    teamName: asText(team?.popularName, asText(team?.name, "Time")),
    probableLineup: lineup,
    suspended,
    injured,
    otherAbsences
  };
}
function parseGePreviewTeams(body, match) {
  const sources = [match?.firstContestant, match?.secondContestant].filter(Boolean);
  const results = new Map();
  const headings = [...body.matchAll(/<h[2-4]\b[^>]*>([\s\S]*?)<\/h[2-4]>/gi)];
  for (let index = 0; index < headings.length; index++) {
    const heading = htmlToText(headings[index][1]).split(/\s+-\s+Técnico\s*:/i)[0].trim();
    const team = sources.find((candidate) => normalizeTeamName(candidate?.popularName || candidate?.name) === normalizeTeamName(heading));
    if (!team) continue;
    const start = headings[index].index + headings[index][0].length;
    const end = headings[index + 1]?.index ?? body.length;
    results.set(Number(team.id), previewTeamInfo(htmlToText(body.slice(start, end)), body.slice(start, end), team));
  }

  const paragraphs = [...body.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)];
  for (const paragraph of paragraphs) {
    const text = htmlToText(paragraph[1]);
    const label = /(?:Suspensos?|Lesionados?|Time provável|Quem está fora)\s*:/i.exec(text);
    if (!label) continue;
    const heading = text.slice(0, label.index).split("\n").map((part) => part.trim()).filter(Boolean).at(-1) || "";
    const team = sources.find((candidate) => normalizeTeamName(candidate?.popularName || candidate?.name) === normalizeTeamName(heading));
    if (!team || results.has(Number(team.id))) continue;
    results.set(Number(team.id), previewTeamInfo(text, paragraph[1], team));
  }
  return sources.map((team) => results.get(Number(team.id)) || previewTeamInfo("", "", team));
}
function parseGeArticleDocument(html, url) {
  const body = geArticleBody(html);
  if (!body) return null;
  const title = geMetaValue(html, "og:title") || htmlToText(/<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] || "Pré-jogo do ge");
  const summary = geMetaValue(html, "og:description") || geMetaValue(html, "description");
  const updatedAt = geMetaValue(html, "article:modified_time")
    || geMetaValue(html, "dateModified")
    || geMetaValue(html, "article:published_time")
    || geMetaValue(html, "datePublished")
    || null;
  return {
    sourceUrl: safeGeUrl(url),
    title: decodeHtmlEntities(title),
    summary: decodeHtmlEntities(summary),
    updatedAt,
    body
  };
}
async function geArticleFor(url) {
  const now = Date.now();
  const cached = geArticleCache.get(url);
  if (cached && now - cached.savedAt < GE_ARTICLE_CACHE_TTL_MS) return cached.article;
  try {
    const article = parseGeArticleDocument(await fetchGeHtml(url), url);
    geArticleCache.set(url, { savedAt: now, article });
    return article;
  } catch (error) {
    geArticleCache.set(url, { savedAt: now, article: null });
    return null;
  }
}
async function geMatchPreviewFor(date, id) {
  const cacheKey = date + ":" + id;
  const now = Date.now();
  const cached = gePreviewCache.get(cacheKey);
  if (cached?.payload && now - cached.savedAt < GE_PREVIEW_CACHE_TTL_MS) return cached.payload;
  if (cached?.failedAt && now - cached.failedAt < GE_PREVIEW_RETRY_TTL_MS) {
    return cached.payload || { available: false, source: null, sourceUrl: null, matchPageUrl: GE_AGENDA_URL, title: null, summary: null, updatedAt: null, stale: false, teams: [], message: "A prévia do ge não está disponível no momento." };
  }

  const feed = await geBroadcastsFor(date);
  const entry = geAgendaCache?.schedule ? findGeEvent(geAgendaCache.schedule, date, id) : null;
  if (!feed.available || !entry) {
    const payload = { available: false, source: null, sourceUrl: null, matchPageUrl: GE_AGENDA_URL, title: null, summary: null, updatedAt: null, stale: false, teams: [], message: "Não encontramos uma prévia publicada pelo ge para este jogo." };
    gePreviewCache.set(cacheKey, { savedAt: now, failedAt: now, payload });
    return payload;
  }

  const match = entry.event.match;
  const candidates = [geMatchPreviewUrl(match), ...geRoundPreviewUrls(date, entry.championship, match)].filter(Boolean);
  for (const url of [...new Set(candidates)]) {
    const article = await geArticleFor(url);
    if (!article) continue;
    const teams = parseGePreviewTeams(article.body, match);
    const hasTeamInfo = teams.some((team) => team.probableLineup || team.suspended || team.injured || team.otherAbsences);
    if (url.includes("/cartola/noticia/") && !hasTeamInfo) continue;
    const payload = {
      available: true,
      source: "GE",
      sourceUrl: article.sourceUrl,
      matchPageUrl: safeGeUrl(match?.transmission?.url) || GE_AGENDA_URL,
      title: article.title,
      summary: article.summary,
      updatedAt: article.updatedAt,
      stale: Boolean(feed.stale),
      teams,
      message: hasTeamInfo ? "" : "O ge publicou uma prévia da partida, mas ainda não detalhou desfalques ou escalações."
    };
    gePreviewCache.set(cacheKey, { savedAt: now, payload });
    return payload;
  }
  const payload = { available: false, source: null, sourceUrl: null, matchPageUrl: safeGeUrl(match?.transmission?.url) || GE_AGENDA_URL, title: null, summary: null, updatedAt: null, stale: feed.stale, teams: [], message: "O ge ainda não publicou uma prévia com desfalques e escalações para este jogo." };
  gePreviewCache.set(cacheKey, { savedAt: now, failedAt: now, payload });
  return payload;
}
function attachBroadcasts(matches, geFeed, cbfFeed) {
  return matches.map((match) => {
    const matchDate = localDate(match.utcDate);
    const matchTime = localTime(match.utcDate);
    const home = normalizeTeamName(match.homeTeam.name);
    const away = normalizeTeamName(match.awayTeam.name);
    const sameFixture = (game) => game.date === matchDate && game.home === home && game.away === away;
    const geCandidates = (geFeed?.games || []).filter(sameFixture);
    const geExact = geCandidates.filter((game) => game.time === matchTime);
    const geConfirmed = geExact.length === 1 && geExact[0].channels.length > 0;
    const cbfCandidates = (cbfFeed?.games || []).filter(sameFixture);
    const cbfExact = cbfCandidates.filter((game) => game.time === matchTime);
    const cbfConfirmed = cbfExact.length === 1 && cbfExact[0].channels.length > 0;

    let selected = null;
    let status = "unconfirmed";
    if (geConfirmed) {
      selected = { game: geExact[0], source: "GE", feed: geFeed };
      status = "confirmed";
    } else if (cbfConfirmed) {
      selected = { game: cbfExact[0], source: "CBF", feed: cbfFeed };
      status = "confirmed";
    } else {
      const geConflict = geCandidates.some((game) => game.channels.length > 0) || geExact.length > 1;
      const cbfConflict = cbfCandidates.some((game) => game.channels.length > 0) || cbfExact.length > 1;
      if (geConflict || cbfConflict) {
        const feed = geConflict ? geFeed : cbfFeed;
        selected = { game: (geConflict ? geCandidates : cbfCandidates)[0], source: geConflict ? "GE" : "CBF", feed };
        status = "review";
      }
    }

    return {
      ...match,
      broadcast: {
        channels: status === "confirmed" ? selected.game.channels : [],
        status: status === "unconfirmed" && !geFeed?.available && !cbfFeed?.available ? "unavailable" : status,
        source: selected?.source || null,
        sourceUrl: selected?.game.sourceUrl || selected?.feed.sourceUrl || null,
        checkedAt: selected?.feed.checkedAt || geFeed?.checkedAt || cbfFeed?.checkedAt || null,
        stale: selected ? Boolean(selected.feed?.stale) : Boolean(geFeed?.stale && !cbfFeed?.available)
      }
    };
  });
}
function safeCrest(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "crests.football-data.org") return null;
    return url.toString();
  } catch {
    return null;
  }
}
function normalizeMatch(match) {
  const score = match.score?.fullTime || {};
  return {
    id: match.id,
    utcDate: match.utcDate,
    status: asText(match.status, "UNKNOWN"),
    minute: Number.isInteger(match.minute) ? match.minute : null,
    venue: typeof match.venue === "string" ? match.venue : null,
    competition: {
      code: asText(match.competition?.code, ""),
      name: asText(match.competition?.name, "Competição a confirmar")
    },
    homeTeam: {
      id: Number.isInteger(match.homeTeam?.id) ? match.homeTeam.id : null,
      name: asText(match.homeTeam?.name, "Mandante a confirmar"),
      crest: safeCrest(match.homeTeam?.crest),
      shortName: asText(match.homeTeam?.shortName, asText(match.homeTeam?.name, "Mandante a confirmar"))
    },
    awayTeam: {
      id: Number.isInteger(match.awayTeam?.id) ? match.awayTeam.id : null,
      name: asText(match.awayTeam?.name, "Visitante a confirmar"),
      crest: safeCrest(match.awayTeam?.crest),
      shortName: asText(match.awayTeam?.shortName, asText(match.awayTeam?.name, "Visitante a confirmar"))
    },
    goals: Array.isArray(match.goals) ? match.goals.map((goal) => ({
      teamId: Number.isInteger(goal.team?.id) ? goal.team.id : null,
      scorer: asText(goal.scorer?.name, ""),
      minute: Number.isInteger(goal.minute) ? goal.minute : null,
      injuryTime: Number.isInteger(goal.injuryTime) ? goal.injuryTime : null,
      type: asText(goal.type, "")
    })) : [],
    score: {
      winner: typeof match.score?.winner === "string" ? match.score.winner : null,
      fullTime: {
        home: Number.isInteger(score.home) ? score.home : null,
        away: Number.isInteger(score.away) ? score.away : null
      }
    }
  };
}
class UpstreamError extends Error {
  constructor(status, detail) {
    super("football-data.org respondeu com status " + status);
    this.status = status;
    this.detail = detail || "";
  }
}
async function fetchMatches(date) {
  const token = process.env.FOOTBALL_DATA_API_TOKEN;
  if (!token) {
    const error = new Error("A integração da Football-Data.org ainda não foi configurada.");
    error.status = 503;
    throw error;
  }

  const url = new URL("https://api.football-data.org/v4/matches");
  url.searchParams.set("dateFrom", shiftDate(date, -1));
  url.searchParams.set("dateTo", shiftDate(date, 2));

  let response = await fetch(url, {
    headers: { "X-Auth-Token": token, "X-Unfold-Goals": "true", Accept: "application/json" },
    signal: AbortSignal.timeout(12_000)
  });
  let goalDetailsRequested = true;
  if (response.status === 403) {
    await response.arrayBuffer();
    response = await fetch(url, {
      headers: { "X-Auth-Token": token, Accept: "application/json" },
      signal: AbortSignal.timeout(12_000)
    });
    goalDetailsRequested = false;
  }
  if (!response.ok) {
    const responseText = await response.text();
    let detail = responseText.slice(0, 300);
    try {
      const responseBody = JSON.parse(responseText);
      detail = responseBody.error || responseBody.message || detail;
    } catch {}
    throw new UpstreamError(response.status, detail);
  }

  const body = await response.json();
  if (!Array.isArray(body.matches)) throw new Error("A resposta da Football-Data.org não contém uma lista de partidas.");

  const playedStatuses = new Set(["IN_PLAY", "PAUSED", "EXTRA_TIME", "PENALTY_SHOOTOUT", "FINISHED", "AWARDED"]);
  const playedMatches = body.matches.filter((match) => playedStatuses.has(match.status));
  const goalEventsAvailable = playedMatches.length === 0
    ? null
    : goalDetailsRequested && playedMatches.some((match) => Array.isArray(match.goals));

  const matches = body.matches
    .filter((match) => typeof match.utcDate === "string" && Number.isFinite(new Date(match.utcDate).getTime()))
    .filter((match) => localDate(match.utcDate) === date)
    .map(normalizeMatch)
    .sort((a, b) => a.utcDate.localeCompare(b.utcDate));

  return {
    date,
    timezone: TIME_ZONE,
    fetchedAt: new Date().toISOString(),
    stale: false,
    goalEventsAvailable,
    matches
  };
}
async function matchesFor(date) {
  const cached = cache.get(date);
  if (cached && Date.now() - cached.savedAt < CACHE_TTL_MS) return cached.payload;

  try {
    const [matchesResult, geResult, cbfResult] = await Promise.allSettled([
      fetchMatches(date),
      geBroadcastsFor(date),
      cbfBroadcastsFor(date)
    ]);
    const geFeed = geResult.status === "fulfilled" ? geResult.value : null;
    const cbfFeed = cbfResult.status === "fulfilled" ? cbfResult.value : null;
    const broadcastsAvailable = Boolean(geFeed?.available || cbfFeed?.available);
    const broadcastsCheckedAt = geFeed?.checkedAt || cbfFeed?.checkedAt || null;
    let payload;
    if (geFeed?.available && geFeed.games.length > 0) {
      let matches = matchesFromGe(geFeed);
      if (matchesResult.status === "fulfilled") {
        matches = enrichGeMatchesWithFootballData(matches, matchesResult.value);
      }
      payload = {
        date,
        timezone: TIME_ZONE,
        fetchedAt: geFeed.checkedAt || new Date().toISOString(),
        stale: Boolean(geFeed.stale),
        matchesSource: "ge",
        broadcastsAvailable,
        broadcastsCheckedAt,
        goalEventsAvailable: matchesResult.status === "fulfilled"
          ? matchesResult.value.goalEventsAvailable
          : false,
        matches: attachBroadcasts(matches, geFeed, cbfFeed)
      };
    } else if (matchesResult.status === "fulfilled") {
      const matchesPayload = matchesResult.value;
      payload = {
        ...matchesPayload,
        matchesSource: "football-data.org",
        broadcastsAvailable,
        broadcastsCheckedAt,
        matches: attachBroadcasts(matchesPayload.matches, geFeed, cbfFeed)
      };
    } else if (cbfFeed?.available) {
      payload = {
        date,
        timezone: TIME_ZONE,
        fetchedAt: cbfFeed.checkedAt || new Date().toISOString(),
        stale: cbfFeed.stale,
        matchesSource: "cbf",
        broadcastsAvailable,
        broadcastsCheckedAt,
        goalEventsAvailable: false,
        matches: attachBroadcasts(matchesFromCbf(cbfFeed), geFeed, cbfFeed)
      };
    } else if (geFeed?.available && geFeed.games.length === 0) {
      const unavailable = new Error("A agenda do ge não encontrou partidas para a data selecionada, e não foi possível consultar outra fonte.");
      unavailable.status = 502;
      throw unavailable;
    } else {
      throw matchesResult.reason;
    }
    cache.set(date, { savedAt: Date.now(), payload });
    return payload;
  } catch (error) {
    if (cached) return { ...cached.payload, stale: true };
    if (error instanceof UpstreamError) {
      if (error.status === 429) {
        const limited = new Error("A Football-Data.org atingiu o limite de consultas. Tente novamente em alguns minutos.");
        limited.status = 503;
        throw limited;
      }
      if (error.status === 401 || error.status === 403) {
        const unauthorized = new Error("A Football-Data.org restringiu esse recurso. Confira se o token está correto e se seu plano permite acessá-lo.");
        unauthorized.status = 502;
        throw unauthorized;
      }
      const detail = error.detail ? ": " + error.detail : "";
      console.error("[Football-Data.org] HTTP " + error.status + detail);
      const upstream = new Error("A Football-Data.org respondeu com HTTP " + error.status + detail + ".");
      upstream.status = 502;
      throw upstream;
    }
    if (!error.status) error.status = 502;
    throw error;
  }
}
async function handle(request, response) {
  const url = new URL(request.url, "http://localhost");
  const previewRoute = url.pathname.match(/^\/api\/matches\/(\d+)\/preview$/);
  if (request.method === "GET" && previewRoute) {
    const date = url.searchParams.get("date");
    const id = Number(previewRoute[1]);
    if (!validDate(date) || !Number.isSafeInteger(id) || id < 1) {
      sendJson(response, 400, { error: "Informe uma data e um jogo válidos." });
      return;
    }
    try {
      sendJson(response, 200, await geMatchPreviewFor(date, id));
    } catch (error) {
      sendJson(response, error.status || 502, { error: error.message || "Não foi possível carregar a prévia do jogo." });
    }
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/matches") {
    const date = url.searchParams.get("date");
    if (!validDate(date)) {
      sendJson(response, 400, { error: "Informe uma data válida no formato AAAA-MM-DD." });
      return;
    }
    try {
      sendJson(response, 200, await matchesFor(date));
    } catch (error) {
      sendJson(response, error.status || 502, { error: error.message || "Não foi possível carregar os jogos." });
    }
    return;
  }
  sendJson(response, 404, { error: "Página não encontrada." });
}
const port = Number(process.env.PORT) || 3001;
createServer((request, response) => {
  handle(request, response).catch(() => {
    if (!response.headersSent) sendJson(response, 500, { error: "Erro interno ao processar a solicitação." });
    else response.end();
  });
}).listen(port, "127.0.0.1", () => {
  console.log("Onde Passa Hoje disponível em http://localhost:" + port);
});

