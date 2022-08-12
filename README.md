# 🔆🔎👀 Smart Contract Storage HexViewer

<a href=https://tintinweb.github.io/smart-contract-storage-viewer/>
<img width="971" alt="image" src="https://user-images.githubusercontent.com/2865694/182379988-6ee51fee-a521-4fa1-b344-4a23ca2429f9.png">


<img width="971" alt="image" src="https://user-images.githubusercontent.com/2865694/184351192-e9d1bdd2-b115-43cc-bbdd-9337b5dd6969.png">

</a>

## Demo

- **Target** - the target contract
- **API Endpoint** - your [infura](https://infura.io/register) (or equivalent) api key

Retrieves smart contract storage and displays it in a hex viewer. Attempts to make sense of the values by guessing the datatype for each slot. Guesses are displayed in the tree-view. Note that you can click on an address to open it on etherscan.

👉 https://tintinweb.github.io/smart-contract-storage-viewer/ 

<sup>🗒️ This is a standalone demo with a trial infura key. I suggest you get your own key as this one will likely be rate-limited very soon ;)</sup>

## Development

### Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `pages/index.js`. The page auto-updates as you edit the file.

[API routes](https://nextjs.org/docs/api-routes/introduction) can be accessed on [http://localhost:3000/api/hello](http://localhost:3000/api/hello). This endpoint can be edited in `pages/api/hello.js`.

The `pages/api` directory is mapped to `/api/*`. Files in this directory are treated as [API routes](https://nextjs.org/docs/api-routes/introduction) instead of React pages.

## Acknowledgements

* [infura.io](https://infura.io/) - as a provider for storage slot data
* [react-hex-editor](https://www.npmjs.com/package/react-hex-editor) - hex view component
* [react-json-view](https://www.npmjs.com/package/react-json-view) - tree view component
