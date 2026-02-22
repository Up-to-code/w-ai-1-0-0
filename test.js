const url = "https://giant-heron-232.convex.cloud/api/query";
const body = {
    path: "campaigns:getCampaignById",
    args: { id: "jh7a0ap0ggd0w16rjnn1b8d33s81nn53" },
    format: "json"
};

fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
}).then(r => r.json()).then(console.log).catch(console.error);
