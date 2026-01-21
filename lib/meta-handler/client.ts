import axios from "axios";

const META_VERSION = "v19.0";
const BASE_URL = `https://graph.facebook.com/${META_VERSION}`;

export const metaClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const setMetaToken = (token: string) => {
  metaClient.defaults.headers.common["Authorization"] = `Bearer ${token}`;
};

export const downloadMedia = async (url: string, token: string): Promise<ArrayBuffer> => {
  const response = await axios.get(url, {
    responseType: "arraybuffer",
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};
