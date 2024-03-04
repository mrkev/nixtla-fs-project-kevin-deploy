import { githubHeadersGetLastPage } from "./common/api";
import { range } from "./common/utils";
import { GH_TOKEN } from "./data/github";
import { exhaustive } from "./utils";

const repos = async (res: Response) => {
  const json = await res.json();
  if (Array.isArray(json)) {
    return json;
  } else {
    return [];
  }
};

const PER_PAGE = 1;
async function fetchRepos(src: "orgs" | "users", name: string, page: number) {
  const req = await fetch(
    `https://api.github.com/${src}/${name}/repos?type=all&page=${page}&per_page=${PER_PAGE}`,
    {
      headers: {
        Authorization: `token ${GH_TOKEN}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  );
  return {
    json: await req.json(),
    headers: Object.fromEntries(req.headers.entries()),
  };
}

async function fetchReposPaginated(
  src: "orgs" | "users",
  name: string,
  lastPage: number
) {
  const results = await Promise.all(
    range(1, lastPage).map((i) =>
      fetchRepos(src, name, i).then((res) => {
        return (Array.isArray(res.json) ? res.json : []) as Array<any>;
      })
    )
  );

  return results.flat();
}

export async function getAllRepos(name: string) {
  // TODO: swithc to api to acutally get all
  const [orgRes, userRes] = await Promise.all([
    fetchRepos("orgs", name, 1),
    fetchRepos("users", name, 1),
  ]);

  const src = Array.isArray(orgRes.json)
    ? "orgs"
    : Array.isArray(userRes.json)
    ? "users"
    : null;

  const reposRaw = await (async () => {
    switch (src) {
      case "orgs": {
        const last = githubHeadersGetLastPage(orgRes.headers);
        return last == null || last == 1
          ? orgRes.json
          : await fetchReposPaginated("orgs", name, last);
      }

      case "users": {
        const last = githubHeadersGetLastPage(userRes.headers);
        return last == null || last == 1
          ? userRes.json
          : await fetchReposPaginated("users", name, last);
      }
      case null:
        return [];
      default:
        exhaustive(src);
    }
  })();

  return reposRaw.map((repo: any) => ({
    name: `${name}/${repo.name}`,
    stargazers_count: repo.stargazers_count,
  }));
}
