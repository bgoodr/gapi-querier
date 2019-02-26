import apiGooglePhotos from '../helpers/google-photos.js';

const _mediaItems = {};

function storeMediaItems(mediaItems) {
	if (!mediaItems) return;

	for (const mi of mediaItems) {
		_mediaItems[mi.id] = mi.productUrl;
	}
}
function forgetMediaItems(mediaItems) {
	if (!mediaItems) return;

	for (const mi of mediaItems) {
		delete _mediaItems[mi.id];
	}
}

async function requestPagedRecursively(method, path, body, processResults, pageToken) {
	let url = path;

	if (pageToken) {
		if (method === 'GET') {
			if (!path.endsWith('&') && !path.endsWith('?')) {
				url += (path.indexOf('?') >= 0) ? '&' : '?';
			}

			url += `pageToken=${pageToken}`;
		}
		else {
			body = body || {};
			body.pageToken = pageToken;
		}
	}

	return apiGooglePhotos.request(method, url, body)
		.then(async (results) => {
			await processResults(results);

			if (results.nextPageToken) {
				return requestPagedRecursively(method, path, body, processResults, results.nextPageToken);
			}
		});
}

async function runAsync(checkSharedAlbums) {
	await requestPagedRecursively('GET', '/mediaItems?pageSize=100', null, async (results) =>
		storeMediaItems(results.mediaItems));

	await requestPagedRecursively('GET', '/albums?pageSize=50', null, async (results) => {
		if (!results.albums) return;

		for (const a of results.albums) {
			await requestPagedRecursively(
				'POST', '/mediaItems:search', { albumId: a.id, pageSize: 100 },
				async (results) => forgetMediaItems(results.mediaItems));
		}
	});

	if (checkSharedAlbums) {
		await requestPagedRecursively('GET', '/sharedAlbums?pageSize=50', null, async (results) => {
			if (!results.sharedAlbums) return;

			for (const a of results.sharedAlbums) {
				await requestPagedRecursively(
					'POST', '/mediaItems:search', { albumId: a.id, pageSize: 100 },
					async (results) => forgetMediaItems(results.mediaItems));
			}
		});
	}

	if (Object.keys(_mediaItems).length) {
		const frag = document.createDocumentFragment(),
			  table = document.createElement('table');

		for (const id in _mediaItems) {
			const url = _mediaItems[id],
				  tr = document.createElement('tr');

			tr.innerHTML =
				//`<td>${id}<td>` +
				`<td><a href='${url}' target='_blank'>${url}</a><td>`;

			table.appendChild(tr);
		}

		frag.appendChild(table);
		return frag;
	}
	else return 'No out-of-album photos found';
}

export default [
	{
		name: 'Find out-of-album photos',
		scopes: 'https://www.googleapis.com/auth/photoslibrary.readonly',

		async run() {
			console.log('findOutOfAlbumPhotos : running');
			const output = await runAsync();
			console.log('findOutOfAlbumPhotos : finished');
			return output;
		}
	},
	{
		name: 'Find out-of-album photos (including "shared" albums)',
		scopes: 'https://www.googleapis.com/auth/photoslibrary.readonly',

		async run() {
			console.log('findOutOfAlbumPhotos(w/shared) : running');
			const output = await runAsync(true);
			console.log('findOutOfAlbumPhotos(w/shared) : finished');
			return output;
		}
	}
]