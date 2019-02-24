import apiGooglePhotos from '../helpers/google-photos.js';

const _mediaItems = {};

function storeMediaItems(mediaItems) {
	console.log('storeMediaItems : mediaItems', mediaItems); // 1681b41d-7207-4049-81f2-98dc0b99f9f8 debug code to be deleted later
	for (const mi of mediaItems) {
		_mediaItems[mi.id] = mi.productUrl;
	}
}
function forgetMediaItems(mediaItems) {
	for (const mi of mediaItems) {
		delete _mediaItems[mi.id];
	}
}

async function requestPagedRecursively(method, path, body, processResults, pageToken) {
	console.log('requestPagedRecursively : method', method, 'path', path); // 1681b41d-7207-4049-81f2-98dc0b99f9f8 debug code to be deleted later
	pageToken = pageToken || '';

	let url = path;

	if (pageToken) {
		if (method === 'GET') {
			if (!path.endsWith('&') && !path.endsWith('?')) {
				url += (path.indexOf('?') >= 0) ? '&' : '?';
			}

			url += `pageToken=${pageToken}`;
		}
		else {
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

async function runAsync() {
	await requestPagedRecursively('GET', '/mediaItems', null, async (results) => storeMediaItems(results.mediaItems));

	await requestPagedRecursively('GET', '/albums', null, async (results) => {
		for (const a of results.albums) {
			await requestPagedRecursively(
				'POST', '/mediaItems:search', { albumId: a.id },
				async (results) => forgetMediaItems(results.mediaItems));
		}
	});

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

export default {
	name: 'Find out-of-album photos',
	scopes: 'https://www.googleapis.com/auth/photoslibrary.readonly',

	async run() {
		console.log('findOutOfAlbumPhotos : running');
		const output = await runAsync();
		console.log('findOutOfAlbumPhotos : finished');
		return output;
	}
}
