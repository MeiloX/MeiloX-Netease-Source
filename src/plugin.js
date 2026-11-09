const CORE=['links.resolve','catalog.search','catalog.track','catalog.tracks','album.get','album.tracks','artist.get','artist.tracks','artist.albums','playlist.get','playlist.tracks','feed.home','feed.discover','account.get','library.likedTracks','library.createdPlaylists','library.savedPlaylists','library.savedAlbums','library.followedArtists','track.liked','track.like','collection.saved','collection.save','playlist.create','playlist.update','playlist.delete','playlist.addTracks','playlist.removeTracks','playlist.reorderTracks','playback.resolve','playback.qualities'];
function guard(fn){try{return fn();}catch(error){return fail(error&&error.sourceCode||'INVALID_RESPONSE');}}
const plugin={onResponse(operation,response,state,context){return guard(()=>operation==='feature.invoke'?respondFeature(response,state,context):respondCore(operation,response,state,context));}};
for(const operation of CORE)plugin[operation]=(params,context)=>guard(()=>startCore(operation,params,context));
plugin['feature.invoke']=(params,context)=>guard(()=>startFeature(params,context));
globalThis.sourcePlugin=plugin;
