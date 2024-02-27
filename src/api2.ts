import { Octokit } from "@octokit/rest";

const repos = async (res: Response) => {
  const json = await res.json();
  if (Array.isArray(json)) {
    return json;
  } else {
    return [];
  }
};

export async function getAllRepos(name: string) {
  // TODO: swithc to api to acutally get all
  const [org, user] = await Promise.all([
    fetch(`https://api.github.com/orgs/${name}/repos?type=all`).then(repos),
    fetch(`https://api.github.com/users/${name}/repos?type=all`).then(repos),
  ]);
  const result = org.concat(user);
  console.log("result", result);
  return result.map((repo: any) => ({
    name: `${name}/${repo.name}`,
    stargazers_count: repo.stargazers_count,
  }));
}
