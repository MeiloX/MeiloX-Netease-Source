const FEATURES={
 web:['openPage'],
 messages:['privateConversations','officialConversations','privateMessages','sendPrivateText','messageContacts','sendPrivateResource'],
 together:['parseInvitation','invitationLink','listenTogetherStatus','createListenTogetherRoom','checkListenTogetherRoom','acceptListenTogetherRoom','reportListenTogetherCommand','listenTogetherPlayback','reportListenTogetherPlaylist','sendListenTogetherHeartbeat','endListenTogetherRoom'],
 recognition:['match'],
 account:['accountProfile','accountDetail','accountPlaylists','accountConnections','setArtistFollowed'],
 podcasts:['podcastHome','podcasts','podcastDetail','podcastProgram','podcastPrograms','subscribedPodcasts','setPodcastSubscribed','search'],
 discovery:['searchCategories','searchDiscovery','dailySongs','homePlayback','personalRadio','cloudShuffle','shuffleInput','shufflePolicy','privateFmModes','intelligence','topLists','playlistCategories','searchSuggestions','searchHot'],
 security:['summary','musician','phoneBinding','devices','authorizations','removeDevice','revokeAuthorization','sendDeviceVerificationCode','bindings','protection'],
 cloud:['cloudSongs','deleteCloudSong','uploadCloudSong'],
 stats:['userPlayRecords','listeningStatsSummary','listeningStatsReport','listeningStatsYears','recentSongs'],
 history:['recordPlaybackStart','recordPlaybackDuration'],
 social:['shareLink','shareToTimeline','songWiki','comments','floorComments','sendComment','likeComment'],
 login:['parsePcQr','exportSession','sessionState','logout','importCookie','webLogin','loginWithMobilePassword','loginWithUpSms','accountProfile','qrKey','qrStatus','pcQrLogin','preparePcQrLoginSecurity','markPcQrScanned','authorizePcQrLogin','cancelPcQrLogin','requestMobileSmsCode','loginWithMobileSms']
};
const WRITE_ACTIONS=new Set(['sendPrivateText','sendPrivateResource','setArtistFollowed','setPodcastSubscribed','removeDevice','revokeAuthorization','sendDeviceVerificationCode','deleteCloudSong','reportListenTogetherCommand','reportListenTogetherPlaylist','sendListenTogetherHeartbeat','endListenTogetherRoom','shareToTimeline','sendComment','likeComment','recordPlaybackStart','recordPlaybackDuration']);
function nonempty(value,max=10000){const result=text(value,max);if(!result.trim())problem('INVALID_RESPONSE');return result;}
function signed(value,fallback=-1){const number=Number(value);return Number.isSafeInteger(number)?number:fallback;}
function featureParams(params){const p=object(params),feature=String(p.feature),action=String(p.action);if(feature==='online'){const family=Object.keys(FEATURES).find(key=>FEATURES[key].includes(action));if(!family)problem('UNSUPPORTED');return {feature:family,action,parameters:object(p.parameters)};}if(!FEATURES[feature]?.includes(action))problem('UNSUPPORTED');return {feature,action,parameters:object(p.parameters)};}
function contacts(value){if(!value||!value.userId)return null;return {id:id(value.userId),nickname:text(value.nickname)||'NetEase user',avatarUrl:artwork(value.avatarUrl)||null,signature:text(value.signature)||null,remarkName:text(value.remarkName)||null,avatarBadgeUrl:artwork(value.avatarDetail?.identityIconUrl)||null};}
function parseJson(value,fallback={}){if(value&&typeof value==='object')return value;try{return parseJSON(value);}catch(_){return fallback;}}
function shareResource(kind,value){if(!value||!value.id)return null;const album=object(value.al||value.album),artists=artistNames(value.ar||value.artists);return {kind,id:id(value.id),title:text(value.name)||kind,subtitle:kind==='Playlist'?text(value.creator?.nickname)||null:artists.map(v=>v.name).join(' / ')||text(value.artist?.name)||null,artworkUrl:artwork(kind==='Song'?album.picUrl:kind==='Playlist'?value.coverImgUrl||value.picUrl:value.picUrl)||null};}
function messagePayload(serialized){const wire=parseJson(serialized,null);if(!wire||typeof wire!=='object')return {text:text(serialized,20000),resource:null};let resource=null;for(const [field,kind]of [['song','Song'],['playlist','Playlist'],['album','Album']])if(wire[field]){resource=shareResource(kind,wire[field]);break;}return {text:text(wire.msg,20000).trim(),resource};}
function conversation(value){const from=contacts(value.fromUser),to=contacts(value.toUser),users=[from?.id||'0',to?.id||'0'].sort((a,b)=>a.length-b.length||a.localeCompare(b));const payload=messagePayload(value.lastMsg);return {id:users.join('-'),fromUser:from,toUser:to,lastMessageTime:integer(value.lastMsgTime,0,0,Number.MAX_SAFE_INTEGER),summary:payload.text||payload.resource?.title||'',unreadCount:integer(value.newMsgCount),isOfficialGroup:integer(value.aggregationType)===1||[from,to].some(user=>user&&(user.id==='8888'||user.nickname==='官方号消息'))};}
function privateMessage(value){const time=integer(value.time,0,0,Number.MAX_SAFE_INTEGER);return {id:text(value.id||time),fromUser:contacts(value.fromUser),toUser:contacts(value.toUser),time,payload:messagePayload(value.msg)};}
function room(value){if(!value||!value.roomId)problem('INVALID_RESPONSE');return {id:text(value.roomId),creatorId:text(value.creatorId),users:array(value.roomUsers).filter(user=>user.userId).map(user=>({id:text(user.userId),nickname:text(user.nickname)||'NetEase user',avatarUrl:artwork(user.avatarUrl)||null})),createTime:value.roomCreateTime||null,effectiveDurationMs:value.effectiveDurationMs||null};}
function identifier(value,depth=0){if(depth>5)return null;if(value&&typeof value==='object')return identifier(value.id??value.value??value.songId,depth+1);const result=String(value??'');return /^[1-9][0-9]{0,18}$/.test(result)?result:null;}
function togetherPlayback(data){const playlist=object(data.playlist),mode=text(playlist.playMode),random=/RANDOM|SHUFFLE/i.test(mode),songs=array(object(playlist[random?'randomList':'displayList']).result).map(value=>identifier(value)).filter(Boolean),command=object(data.playCommand),play=text(command.playStatus).toUpperCase(),type=text(command.commandType).toUpperCase();return {songIds:[...new Set(songs)],playMode:mode||null,command:Object.keys(command).length?{commandType:type||null,targetSongId:identifier(command.targetSongId),formerSongId:identifier(command.formerSongId),progressMs:integer(command.progress,0,0,Number.MAX_SAFE_INTEGER),isPlaying:['PLAY','PLAYING'].includes(play)?true:['PAUSE','PAUSED'].includes(play)?false:['PLAY','GOTO','NEXT','PREV'].includes(type)?true:type==='PAUSE'?false:null,clientSequence:integer(command.clientSeq,0,0,Number.MAX_SAFE_INTEGER),serverSequence:integer(command.serverSeq,0,0,Number.MAX_SAFE_INTEGER)}:null};}
const READ_FALLBACK=new Set(['privateConversations','privateMessages','messageContacts','listenTogetherStatus','accountDetail','accountPlaylists','accountConnections','podcasts','podcastDetail','podcastProgram','podcastPrograms','subscribedPodcasts','cloudSongs','userPlayRecords','listeningStatsSummary','listeningStatsReport','listeningStatsYears','recentSongs']);
function featureRequest(path,fields,context,state,mode='weapi'){return request(path,fields,context,{...state,step:'feature',mode,wirePath:path,wireFields:fields},mode);}
function cloudShuffleRequest(playlistId,context,state,route='native'){
 const p=state.params.parameters,path='/api/playlist/random/list/get',fields={playlistId:id(playlistId),songId:id(p.songId)},alg=text(p.alg,1000);
 if(route==='native'||alg)fields.alg=alg;
 const extra=route==='native'?{host:API,eapiNumericFields:['playlistId','songId']}:{eapiEnvelope:{header:'{}',e_r:route==='tv'?true:'true'},...(route==='tv'?{host:'https://interfacetv.music.163.com'}:{})};
 return request(path,fields,context,{...state,step:'feature',mode:'eapi',shuffleRoute:route,wirePath:path,wireFields:fields},'eapi',{errorResponse:true,...extra});
}
function cloudShuffleResult(body){
 const data=object(body.data);if(data.songIds!=null&&!Array.isArray(data.songIds))problem('INVALID_RESPONSE');
 let values=data.songIds;
 if(!values?.length&&Array.isArray(data.songData)&&data.songData.length&&Array.isArray(data.privileges))values=data.songData.map(value=>value?.id);
 if(!Array.isArray(values))problem('INVALID_RESPONSE');if(!values.length)problem('UNAVAILABLE');
 const order=values.map(value=>identifier(value));if(order.some(value=>!value))problem('INVALID_RESPONSE');
 return {order,tracks:mapped(array(data.songData).slice(0,30),trackData),unavailable:array(data.privileges).filter(value=>Number(value.st)<0||value.pl!=null&&Number(value.pl)===0&&(!text(value.playMaxBrLevel).trim()||text(value.playMaxBrLevel).toLowerCase()==='none')).map(value=>identifier(value.id)).filter(Boolean)};
}
function respondCloudShuffle(response,state,context){
 try{return done(cloudShuffleResult(parseResponse(response,state,context)),state,context);}
 catch(error){if(state.shuffleRoute!=='tv'&&['NETWORK','UNAVAILABLE'].includes(error?.sourceCode))return cloudShuffleRequest(state.wireFields.playlistId,context,state,state.shuffleRoute==='native'?'watch':'tv');throw error;}
}
function cloudShuffleLikedPlaylists(context,state,uid,offset=0){return request('/api/user/playlist',{uid,offset,limit:100,total:true},context,{...state,step:'cloudShuffleLikedPlaylists',shuffleUid:uid,shuffleOffset:offset},'weapi');}
function shuffleInputRequest(playlistId,context,state){return playlistRequest(playlistId,context,{...state,step:'shuffleInputDetail',playlistId:id(playlistId)});}
function commentThread(p){if(p.contentId!=null){const prefixes={track:'R_SO_4_',playlist:'A_PL_0_',album:'R_AL_3_',program:'A_DJ_1_'};if(!has(prefixes,p.contentType))problem('UNSUPPORTED');return prefixes[p.contentType]+id(p.contentId);}return nonempty(p.threadId,2048);}
function commentCursor(p){const sort=commentSort(p.sortType),offset=(integer(p.pageNo,1,1)-1)*integer(p.pageSize,20,1,100);return sort===2?'normalHot#'+offset:sort===3?text(p.cursor||'0',2048):String(offset);}
function commentSort(value){if(value==null)return 99;if(typeof value==='string'&&has({recommended:99,hot:2,time:3},value))return {recommended:99,hot:2,time:3}[value];const result=Number(value);if(![1,2,3,99].includes(result))problem('INVALID_RESPONSE');return result;}
function startFeature(params,context,state){
 const resumed=resumeEffect(params,context);if(resumed)return resumed;const f=featureParams(params),p=f.parameters,s=state||{params:f,store:newStore(context)};s.params=f;s.featureBound=true;const action=f.action;
 if(['requestMobileSmsCode','loginWithMobileSms','loginWithMobilePassword','loginWithUpSms'].includes(action))return startMobileLogin(params,context,s);
 if(action==='importCookie'){s.store.cookie=nonempty(p.cookie,16000);s.store.sessionType='Web';accountRequired(context,s.store);return request('/api/w/nuser/account/get',{},context,{...s,step:'webAuthAccount'},'eapi');}
 if(action==='webLogin')return hostEffect(context,s,'web.auth',{url:'https://music.163.com/#/login',allowedHosts:['music.163.com'],cookieHosts:['music.163.com'],cookieNames:['MUSIC_U','MUSIC_A','__csrf']},'webAuth');
 if(action==='uploadCloudSong'){accountRequired(context,s.store);return p.file?cloudUploadStart(context,s,p.file):hostEffect(context,s,'files.pick',{mimeTypes:['audio/*'],multiple:false},'cloudPicked');}
 if(['pcQrLogin','preparePcQrLoginSecurity','markPcQrScanned','authorizePcQrLogin','cancelPcQrLogin'].includes(action)){accountRequired(context,s.store);if(String(s.store.sessionType||context.config?.sessionType).toLowerCase()!=='mobile')problem('UNSUPPORTED');if(action==='pcQrLogin')return hostEffect(context,s,'qr.scan',{},'qrScanned');return hostEffect(context,s,'sdk.call',{name:'netease.securityHeaders',arguments:{}},'qrSecurity');}
 if(f.feature==='web'&&action==='openPage')return openOfficialPage(context,s);
 if(action==='parsePcQr')return done(parsePcQr(p.value),s,context);
 if(action==='searchCategories')return done(searchCategories(),s,context);
 if(action==='exportSession'){accountRequired(context,s.store);return done({label:'MUSIC_U',value:authKey(context,s.store)},s,context);}
 if(action==='sessionState'){const authenticatedValue=authenticated(context,s.store),kind=String(s.store.sessionType||context.config?.sessionType||'').toLowerCase();return done({authenticated:authenticatedValue,kind:authenticatedValue?(kind==='mobile'?'mobile':'web'):null},s,context);}
 if(action==='logout'){s.store={cookie:''};return done(true,s,context);}
 if(!['match','podcastHome','podcasts','podcastDetail','podcastProgram','podcastPrograms','search','searchDiscovery','topLists','playlistCategories','searchSuggestions','searchHot','qrKey','qrStatus','requestMobileSmsCode','loginWithMobileSms','comments','floorComments','songWiki','accountDetail','accountPlaylists','accountConnections','userPlayRecords','shareLink'].includes(action))accountRequired(context,s.store);
 if(action==='summary')return startSecuritySummary(context,s);
 if(['recordPlaybackStart','recordPlaybackDuration'].includes(action))return beginHistory(context,s);
 if(action==='musician')return hostEffect(context,s,'sdk.call',{name:'netease.securityHeaders',arguments:{}},'musicianSecurity');
 const send=(path,fields={},mode='weapi')=>featureRequest(path,fields,context,s,mode);
 if(action==='shareLink'){const resource=object(p.resource),kind=String(resource.kind||'').toLowerCase(),path={song:'song',playlist:'playlist',album:'album'}[kind];if(!path)problem('UNSUPPORTED');return done('https://music.163.com/'+path+'?id='+id(resource.id),s,context);}
 if(action==='parseInvitation'){const parsed=resolveLink({text:nonempty(p.text,16000)});return done(parsed?.featureRoute==='listen_together'?parsed.parameters.invitation:null,s,context);}
 if(action==='invitationLink')return done('https://st.music.163.com/listen-together/share?'+Object.entries({roomId:nonempty(p.roomId,2048),inviterId:nonempty(p.inviterId,2048),songId:id(p.songId)}).map(([key,value])=>key+'='+encodeURIComponent(value)).join('&'),s,context);
 switch(action){
  case 'privateConversations':return send('/api/msg/private/users',{offset:integer(p.offset),limit:integer(p.limit,50,1,100),total:'true'});
  case 'officialConversations':return send('/api/communication/aggregation/dialogue/list',{dialogueAggregationQueryMeta:JSON.stringify({aggregationType:1,relatedId:8888,time:signed(p.before),limit:integer(p.limit,20,1,100)})},'eapi');
  case 'privateMessages':return send('/api/msg/private/history',{userId:id(p.userId),time:signed(p.before),limit:integer(p.limit,100,1,100),total:'true'});
  case 'sendPrivateText':case 'sendPrivateResource':{const recipients=[...new Set(ids(p.userIds))].sort();if(!recipients.length)problem('INVALID_RESPONSE');const resource=object(p.resource),type=action==='sendPrivateText'?'text':String(resource.kind||'').toLowerCase();if(!['text','song','playlist','album'].includes(type))problem('UNSUPPORTED');const body={type,msg:action==='sendPrivateText'?nonempty(p.message,5000):text(p.message,5000),userIds:JSON.stringify(recipients)};if(type!=='text')body.id=id(resource.id);return send('/api/msg/private/send',body,'eapi');}
  case 'messageContacts':return send('/api/user/getfollows/'+id(p.userId),{offset:integer(p.offset),limit:integer(p.pageSize||p.limit,100,1,100),order:true});
  case 'listenTogetherStatus':return send('/api/listen/together/status/get');
  case 'createListenTogetherRoom':return send('/api/listen/together/room/create',{refer:'songplay_more'},'eapi');
  case 'checkListenTogetherRoom':return send('/api/listen/together/room/check',{roomId:nonempty(p.roomId,2048)},'eapi');
  case 'acceptListenTogetherRoom':return send('/api/listen/together/play/invitation/accept',{refer:'inbox_invite',roomId:nonempty(p.roomId,2048),inviterId:id(p.inviterId)},'eapi');
  case 'reportListenTogetherCommand':{const named={Play:'PLAY',Pause:'PAUSE',Next:'NEXT',Previous:'PREV',GoTo:'GOTO',Progress:'PROGRESS'};const command=named[p.command]||String(p.command||p.commandType).toUpperCase();if(!['PLAY','PAUSE','GOTO','NEXT','PREV','PROGRESS'].includes(command))problem('UNSUPPORTED');return send('/api/listen/together/play/command/report',{roomId:nonempty(p.roomId,2048),commandInfo:JSON.stringify({commandType:command,progress:integer(p.progressMs,0,0,Number.MAX_SAFE_INTEGER),playStatus:p.isPlaying?'PLAY':'PAUSE',formerSongId:p.formerSongId==null?'-1':id(p.formerSongId),targetSongId:id(p.targetSongId),clientSeq:integer(p.clientSequence,0,0,Number.MAX_SAFE_INTEGER)})},'eapi');}
  case 'listenTogetherPlayback':return send('/api/listen/together/sync/playlist/get',{roomId:nonempty(p.roomId,2048)},'eapi');
  case 'reportListenTogetherPlaylist':return send('/api/listen/together/sync/list/command/report',{roomId:nonempty(p.roomId,2048),playlistParam:JSON.stringify({commandType:'REPLACE',version:[{userId:id(p.userId),version:integer(p.version,0,0,Number.MAX_SAFE_INTEGER)}],anchorSongId:'',anchorPosition:-1,randomList:ids(p.randomSongIds),displayList:ids(p.displaySongIds)})},'eapi');
  case 'sendListenTogetherHeartbeat':return send('/api/listen/together/heartbeat',{roomId:nonempty(p.roomId,2048),songId:id(p.songId),playStatus:p.isPlaying?'PLAY':'PAUSE',progress:integer(p.progressMs,0,0,Number.MAX_SAFE_INTEGER)},'eapi');
  case 'endListenTogetherRoom':return send('/api/listen/together/end/v2',{roomId:nonempty(p.roomId,2048)},'eapi');
  case 'match':{const duration=integer(p.duration,0,1,15);if(!duration)problem('INVALID_RESPONSE');const query={sessionId:'0123456789abcdef',algorithmCode:'shazam_v2',duration,rawdata:nonempty(p.fingerprint,200000),times:1,decrypt:1};const out=send('/api/music/audio/match',{},'api');out.request.method='GET';out.request.url+='?'+Object.entries(query).map(([k,v])=>encodeURIComponent(k)+'='+encodeURIComponent(v)).join('&');delete out.request.body;return out;}
  case 'accountProfile':return send('/api/w/nuser/account/get',{},'eapi');
  case 'accountDetail':return send('/api/v1/user/detail/'+id(p.userId));
  case 'accountPlaylists':return send('/api/user/playlist',{uid:id(p.userId),offset:integer(p.offset),limit:Math.min(100,integer(p.limit,100,1,2000)),includeVideo:true});
  case 'accountConnections':{const followers=String(p.type).toLowerCase()==='followers';return send((followers?'/api/user/getfolloweds/':'/api/user/getfollows/')+id(p.userId),{offset:integer(p.offset),limit:Math.min(30,integer(p.pageSize||p.limit,30,1,100)),...(followers?{userId:id(p.userId),time:'0',getcounts:'true'}:{order:true})});}
  case 'setArtistFollowed':return send('/api/artist/'+(p.followed?'sub':'unsub'),{artistId:id(p.id),artistIds:JSON.stringify([id(p.id)])});
  case 'podcastHome':return send('/api/djradio/category/get');
  case 'podcasts':return send('/api/djradio/hot',{cateId:signed(p.categoryId,0),offset:integer(p.offset),limit:integer(p.limit,30,1,100)});
  case 'podcastDetail':return send('/api/djradio/v2/get',{id:id(p.id||p.radioId)});
  case 'podcastProgram':return send('/api/dj/program/detail',{id:id(p.id||p.programId)});
  case 'podcastPrograms':return send('/api/dj/program/byradio',{radioId:id(p.id||p.radioId),offset:integer(p.offset),limit:integer(p.limit,30,1,100),asc:p.ascending===true});
  case 'subscribedPodcasts':return send('/api/djradio/get/subed',{offset:integer(p.offset),limit:integer(p.limit,50,1,100),total:true});
  case 'setPodcastSubscribed':return send('/api/djradio/'+(p.subscribed?'sub':'unsub'),{id:id(p.id)});
  case 'search':return request('/api/search/get/',{s:nonempty(p.query),type:1009,offset:integer(p.offset),limit:integer(p.limit,30,1,100)},context,{...s,step:'feature'},'api',{headers:{'X-Netease-Cookie-OS':'pc'}});
  case 'searchDiscovery':return send('/api/personalized/playlist',{limit:integer(p.limit,10,1,100),total:true,n:1000},'eapi');
  case 'dailySongs':return send('/api/v3/discovery/recommend/songs');
  case 'homePlayback':
   if(p.kind==='inlinePodcast'){const track=object(p.track);id(track.trackId);if(!track.title)problem('INVALID_RESPONSE');return done({tracks:[track],mediaType:'episode'},s,context);}
   if(p.kind==='podcast')return request('/api/dj/program/detail',{id:id(p.programId)},context,{...s,step:'homePodcast'},'weapi');
   if(p.kind==='intelligence'){
    const seedRequest=detailRequest([id(p.songId)],context,{...s,step:'homeIntelligenceSeed'});
    seedRequest.request.errorResponse=true;
    return seedRequest;
   }
   problem('UNSUPPORTED');
  case 'personalRadio':{const list=value=>ids(Array.isArray(value)?value:parseJson(value,[])),similar=p.similar===true||p.mode==='SIMILAR';if(similar)return send('/api/v1/radio/get',{limit:'3',sourceIds:JSON.stringify(list(p.seedTrackIds||p.sourceIds)),sourceType:'song',mode:'SIMILAR',unplaySonIds:JSON.stringify(list(p.recentTrackIds||p.unplaySonIds))},'weapi');const mode=({default:'DEFAULT',explore:'EXPLORE',familiar:'FAMILIAR',scene:'SCENE_RCMD'})[p.mode]||p.mode||'DEFAULT';if(!['DEFAULT','EXPLORE','FAMILIAR','SCENE_RCMD'].includes(mode))problem('UNSUPPORTED');return send('/api/v1/radio/get',{mode,entranceType:'newframework_daily_recommend_mix',limit:'3',openAidj:'false',unplaySongIds:JSON.stringify(list(p.recentTrackIds||p.unplaySongIds||p.recentSongIds).slice(-200)),...(mode==='SCENE_RCMD'?{subMode:nonempty(p.sceneCode||p.subMode,100),...(p.cascadeMode||p.fmCascadeModeStr?{fmCascadeModeStr:nonempty(p.cascadeMode||p.fmCascadeModeStr,1000)}:{})}:{})},'eapi');}
  case 'shufflePolicy':return shufflePolicyRequest(context,s);
  case 'cloudShuffle':case 'shuffleInput':{
   if(action==='shuffleInput'&&p.collection!=null&&p.collection!=='LIKED_TRACKS')problem('UNSUPPORTED');
   if(p.collection==null)return action==='shuffleInput'?shuffleInputRequest(p.playlistId,context,s):cloudShuffleRequest(p.playlistId,context,s);
   if(p.collection!=='LIKED_TRACKS')problem('UNSUPPORTED');
   if(action==='cloudShuffle')id(p.songId);const uid=knownUid(context);
   return uid?cloudShuffleLikedPlaylists(context,s,uid):request('/api/w/nuser/account/get',{},context,{...s,step:'cloudShuffleAccount'},'eapi');
  }
  case 'privateFmModes':return send('/api/link/position/show/resource',{positionCode:'FMTopModeDialog',extJson:JSON.stringify({isHomePageNewFramework:true,userSetFMMode:true,enableAutoPlay:true})},'eapi');
  case 'intelligence':return send('/api/playmode/intelligence/list',{songId:id(p.id),type:'fromPlayOne',playlistId:id(p.playlistId),startMusicId:id(p.startSongId),count:1},'api');
  case 'topLists':return send('/api/toplist');
  case 'playlistCategories':return send('/api/playlist/catalogue');
  case 'searchSuggestions':return send('/api/search/suggest/web/',{s:nonempty(p.query)},'api');
  case 'searchHot':return send('/api/search/hot/detail',{},'api');
  case 'phoneBinding':return send('/api/user/binding/cellphone');
  case 'protection':return send('/api/usersafe/loginprotect/status/get',{},'eapi');
  case 'devices':return send('/api/middle/user/device/list',{status:'',excStatus:'9'},'eapi');
  case 'authorizations':return send('/api/oauth/app/list/get',{type:p.history?'history':'access',page:JSON.stringify({cursor:text(p.cursor),size:30})},'eapi');
  case 'removeDevice':return send('/api/middle/user/security/device/kickoff',{deviceKey:nonempty(p.key),deviceKeys:'',captcha:text(p.captcha)},'eapi');
  case 'revokeAuthorization':return send('/api/oauth/app/cancel',{clientId:nonempty(p.clientId)},'eapi');
  case 'sendDeviceVerificationCode':return send('/api/sms/captcha/safe/sent',{ctcode:text(p.countryCode||'86',8)},'eapi');
  case 'bindings':if(p.userId)return send('/api/user/bindings/'+id(p.userId),{},'eapi');return featureRequest('/api/nuser/account/get',{},context,{...s,step:'featureBindingsAccount'},'eapi');
  case 'cloudSongs':return send('/api/v1/cloud/get',{offset:integer(p.offset),limit:integer(p.limit,100,1,200)});
  case 'deleteCloudSong':return send('/api/cloud/del',{songIds:[id(p.id)]});
  case 'userPlayRecords':return send('/api/v1/play/record',{uid:id(p.userId),type:p.allTime?0:1});
  case 'listeningStatsSummary':return send('/api/content/activity/listen/data/total');
  case 'listeningStatsReport':{const period={Week:'week',Month:'month',week:'week',month:'month'}[p.period];if(!period)problem('UNSUPPORTED');return send('/api/content/activity/listen/data/'+(p.endTimeMs?'report':'realtime/report'),{type:period,...(p.endTimeMs?{endTime:integer(p.endTimeMs,0,1,Number.MAX_SAFE_INTEGER)}:{})});}
  case 'listeningStatsYears':return send('/api/content/activity/listen/data/year/report');
  case 'recentSongs':return send('/api/play-record/song/list',{limit:integer(p.limit,100,1,100)});
  case 'shareToTimeline':{const resource=object(p.resource),type=String(resource.kind||'').toLowerCase();if(!['song','playlist'].includes(type))problem('UNSUPPORTED');return send('/api/share/friends/resource',{type,msg:text(p.message,5000),id:id(resource.id)},'eapi');}
  case 'songWiki':return send('/api/song/play/about/block/page',{songId:id(p.songId)},'eapi');
  case 'comments':return send('/api/v2/resource/comments',{threadId:commentThread(p),pageNo:integer(p.pageNo,1,1),pageSize:integer(p.pageSize,20,1,100),showInner:true,cursor:commentCursor(p),sortType:commentSort(p.sortType)},'eapi');
  case 'floorComments':return send('/api/resource/comment/floor/get',{parentCommentId:id(p.parentCommentId),threadId:commentThread(p),time:signed(p.time,-1),limit:integer(p.limit,20,1,100)});
  case 'sendComment':return send('/api/resource/comments/'+(p.delete?'delete':p.reply?'reply':'add'),{threadId:commentThread(p),content:p.delete?'':nonempty(p.content,2000),commentId:p.commentId?id(p.commentId):undefined},'eapi');
  case 'likeComment':return send('/api/v1/comment/'+(p.liked?'like':'unlike'),{threadId:commentThread(p),commentId:id(p.commentId)});
  case 'qrKey':return send('/api/login/qrcode/unikey',{type:1},'api');
  case 'qrStatus':return send('/api/login/qrcode/client/login',{key:nonempty(p.key),type:1},'api');
  default:problem('UNSUPPORTED');
 }
}
function respondFeature(response,state,context){
 const f=state.params,p=f.parameters,action=f.action;
 if(action==='shufflePolicy')return respondShufflePolicy(response,state,context);
 if(action==='cloudShuffle'&&state.step==='feature')return respondCloudShuffle(response,state,context);
 if(state.step==='shuffleInputDetail'){
  const body=parseResponse(response,state,context),playlist=object(body.playlist);
  if(String(playlist.id)!==state.playlistId)problem('NOT_FOUND');
  if(!Array.isArray(playlist.trackIds))problem('INVALID_RESPONSE');
  const all=playlist.trackIds.map(value=>id(value?.id));
  if(integer(playlist.trackCount)>all.length)problem('INVALID_RESPONSE');
  return done({playlistId:state.playlistId,ids:all,executionTimeoutMs:2000},state,context);
 }
 if(state.step==='cloudShuffleAccount'){
  let body;try{body=parseResponse(response,state,context);}catch(error){if(state.accountFallback)throw error;return request('/api/nuser/account/get',{},context,{...state,accountFallback:true},'eapi');}
  parseAccount(body,state,context);return cloudShuffleLikedPlaylists(context,state,state.uid);
 }
 if(state.step==='cloudShuffleLikedPlaylists'){
  const body=parseResponse(response,state,context),rows=requiredList(body.playlist),liked=rows.find(value=>String(object(value.creator).userId)===state.shuffleUid&&integer(value.specialType)===5);
  if(liked)return action==='shuffleInput'?shuffleInputRequest(liked.id,context,state):cloudShuffleRequest(liked.id,context,state);
  if(body.more===true&&rows.length)return cloudShuffleLikedPlaylists(context,state,state.shuffleUid,state.shuffleOffset+rows.length);
  problem('NOT_FOUND');
 }
 if(state.step==='historyNcbl'||state.step==='historyWeblog')return respondHistory(response,state,context);
 if(state.step==='connectionArtist'){let detail;try{detail=parseResponse(response,state,context);}catch(_){detail=null;}const target=state.connectionPage.users[state.connectionArtistIndex],profile=detail?.profile;if(profile&&String(profile.userId||profile.id)===target.id&&identifier(profile.artistId))target.artistId=String(profile.artistId);state.connectionArtistIndex++;return resolveConnectionArtist(context,state);}
 if(state.step.startsWith('securitySummary'))return respondSecuritySummary(response,state,context);
 if(state.step==='musicianAuthentication'){const body=parseResponse(response,state,context);state.musicianAuth=object(body.data);return request('/api/nmusician/entrance/user/musician/info/get',{checkToken:state.security.checkToken},context,{...state,step:'musicianInfo'},'eapi',{headers:{'X-Netease-Anti-Cheat-Token':String(state.security.headerAntiCheatToken)}});}
 if(state.step==='musicianInfo'){const body=parseResponse(response,state,context),auth=state.musicianAuth,info=object(body.data);return done({musician:auth.musician===true,dj:auth.dj===true,creator:auth.daren===true,live:auth.live===true,userStatus:integer(info.userStatus),certificationStatus:integer(info.certStatus),remainingPublications:info.leftProductionTimes==null?null:integer(info.leftProductionTimes)},state,context);}
 if(state.step.startsWith('cloudUpload'))return respondCloudUpload(response,state,context);
 if(state.step==='urs')return respondUrs(response,state,context);
 if(state.step==='deviceRegistered'){const body=parseResponse(response,state,context),data=object(body.data);state.store.sDeviceId=nonempty(data.sDeviceId,16000);state.store.deviceRegisteredModel=state.deviceModel;if(data.initAppBySDeviceId===true)state.store.deviceId=state.store.sDeviceId;return state.deviceAfter==='mobile'?mobileFinal(context,state,{...state.security,deviceId:state.store.deviceId,sDeviceId:state.store.sDeviceId}):qrSubmit(context,state,{...state.security,deviceId:state.store.deviceId,sDeviceId:state.store.sDeviceId});}
 if(state.step==='qrAccount'){const body=parseResponse(response,state,context);parseAccount(body,state,context);return qrSubmit(context,state,state.qrProof);}
 if(state.step==='qrSubmitted'){const body=parseResponse(response,state,context,[800]);if(Number(body.code)===800)problem('AUTH_EXPIRED');if(Number(body.code)!==200)problem('INVALID_RESPONSE');return done(state.params.action==='pcQrLogin'?{status:'scanned',platform:text(body.platform),key:state.store.pcQrKey}:state.params.action==='markPcQrScanned'?text(body.platform):true,state,context);}
 if(state.step==='mobileFinal'||state.step==='webAuthAccount'){const body=parseResponse(response,state,context);if(state.step==='mobileFinal')commitMobileCookies(response,state,context);parseAccount(body,state,context);delete state.store.ursLoginToken;delete state.store.ursUpSmsChallenge;state.store.sessionType=state.step==='mobileFinal'?'Mobile':'Web';return done({authenticated:true,...profileData(body.profile||body.data?.profile)},state,context);}
 if(state.step==='homePodcast'){const body=parseResponse(response,state,context);if(String(body.program?.id)!==String(p.programId))problem('INVALID_RESPONSE');return done({tracks:[homeProgramTrack(body.program)],mediaType:'episode'},state,context);}
 if(state.step==='homeIntelligenceSeed'){
  let seed=null;
  try{const body=parseResponse(response,state,context),song=array(body.songs).find(value=>String(value.id)===String(p.songId));if(song)seed=trackData(song);}
  catch(error){if(!error.sourceCode||error.sourceCode==='CANCELLED')throw error;}
  return request('/api/playmode/intelligence/list',{songId:id(p.songId),type:'fromPlayOne',playlistId:id(p.playlistId),startMusicId:id(p.songId),count:1},context,{...state,step:'homeIntelligence',seed},'api');
 }
 if(state.step==='homeIntelligence'){const body=parseResponse(response,state,context);return done({tracks:[...(state.seed?[state.seed]:[]),...mapped(body.data,value=>trackData(value.songInfo||value.song||value))],mediaType:'music'},state,context);}
 if(state.step==='featureBindingsAccount'){const body=parseResponse(response,state,context);const profile=parseAccount(body,state,context);return featureRequest('/api/user/bindings/'+profile.userId,{},context,{...state,step:'feature'},'eapi');}
 let body;try{body=parseResponse(response,state,context,action==='qrStatus'?[800,801,802,803]:action==='removeDevice'?[401]:[]);}catch(error){if(action==='accountProfile'&&!state.accountFallback)return featureRequest('/api/nuser/account/get',{},context,{...state,accountFallback:true},'eapi');if(state.mode==='weapi'&&!state.retriedEapi&&READ_FALLBACK.has(action))return request(state.wirePath,state.wireFields,context,{...state,mode:'eapi',retriedEapi:true},'eapi');throw error;}if(action==='removeDevice'&&Number(body.code)===401)problem('VERIFICATION_REQUIRED');if(WRITE_ACTIONS.has(action)&&Number(body.code)!==200)problem('INVALID_RESPONSE');let value;
 if(state.step==='podcastHomeFeatured')return featureRequest('/api/djradio/personalize/rcmd',{limit:12},context,{...state,step:'podcastHomePersonalized',featured:mapped(body.djRadios,podcastData)});
 if(state.step==='podcastHomePersonalized')return done({categories:state.categories,featured:state.featured,personalized:mapped(body.data,podcastData)},state,context);
 if(state.step==='podcastDetailPrograms'){const programs=programPage(body,p);return done({podcast:state.podcast,programs:programs.programs,hasMore:programs.hasMore,totalCount:programs.totalCount,nextOffset:integer(p.offset)+programs.fetchedCount},state,context);}
 switch(action){
  case 'privateConversations':value=array(body.msgs).map(conversation);break;
  case 'officialConversations':{const data=object(body.data),records=parseJson(data.records,[]);if(!Array.isArray(records))problem('INVALID_RESPONSE');const conversations=records.map(record=>{const raw=object(object(record.userInfoVO).userInfoDetailList?.[0]),last=object(record.lastMsg);let contact=contacts(raw);if(!contact)return null;if(last.noticeAccountFlag&&last.noticeAccount)contact={...contact,nickname:text(last.noticeAccount.name)||contact.nickname,avatarUrl:artwork(last.noticeAccount.avatarUrl)||contact.avatarUrl,remarkName:null};return {id:contact.id,fromUser:contact,toUser:null,lastMessageTime:integer(last.time,0,0,Number.MAX_SAFE_INTEGER),summary:text(last.briefText,20000),unreadCount:integer(record.msgCountVO?.unreadCount),isOfficialGroup:false};}).filter(Boolean);value={conversations,hasMore:data.more===true&&records.length>0,nextTime:records.at(-1)?.lastMsg?.time||-1};break;}
  case 'privateMessages':value=array(body.msgs).map(privateMessage).sort((a,b)=>a.time-b.time);break;
  case 'messageContacts':{const rows=requiredList(body.follow),values=[...new Map(rows.map(contacts).filter(Boolean).map(value=>[value.id,value])).values()],nextOffset=integer(p.offset)+rows.length,hasMore=rows.length>0&&(body.more??rows.length>=integer(p.pageSize||p.limit,100,1,100));value={contacts:values,hasMore:!!hasMore,nextOffset};break;}
  case 'listenTogetherStatus':value={isInRoom:body.data?.inRoom===true,room:body.data?.roomInfo?room(body.data.roomInfo):null,status:text(body.data?.status)||null};break;
  case 'createListenTogetherRoom':case 'acceptListenTogetherRoom':value=room(body.data?.roomInfo);break;
  case 'checkListenTogetherRoom':value={first:body.data?.joinable===true,second:text(body.data?.joinable?body.data?.status:body.data?.copywriting||body.data?.status)||null};break;
  case 'listenTogetherPlayback':value=togetherPlayback(object(body.data));break;
  case 'sendListenTogetherHeartbeat':value=body.data?.timeSpan==null?null:integer(body.data.timeSpan);break;
  case 'match':value=array(body.data?.result).filter(v=>v.song?.id).map(v=>{const song=trackData(v.song);return {id:song.trackId,name:song.title,artists:song.artists.map(a=>a.name),album:song.album.title,coverUrl:song.artworkUrl||null,durationMs:song.durationMs,startTimeMs:v.startTime==null?null:integer(v.startTime,0,0,Number.MAX_SAFE_INTEGER)};});break;
  case 'accountProfile':{parseAccount(body,state,context);value=profileData(body.profile||body.data?.profile);break;}
  case 'accountDetail':value={profile:profileData(body.profile),level:integer(body.level),listenSongs:body.listenSongs==null?null:integer(body.listenSongs),createDays:body.createDays==null?null:integer(body.createDays)};break;
  case 'accountPlaylists':{const rows=requiredList(body.playlist),nextOffset=integer(p.offset)+rows.length;value={playlists:mapped(rows,accountPlaylistData),hasMore:rows.length>0&&(body.more??rows.length>=Math.min(100,integer(p.limit,100,1,2000))),nextOffset};break;}
  case 'accountConnections':{const rows=requiredList(String(p.type).toLowerCase()==='followers'?body.followeds:body.follow),next=integer(p.offset)+rows.length;state.connectionPage={users:[...new Map(mapped(rows,profileData).map(user=>[user.id,user])).values()],hasMore:rows.length>0&&(body.more??rows.length>=Math.min(30,integer(p.pageSize||p.limit,30,1,100))),nextOffset:next};state.connectionArtistIndex=0;return resolveConnectionArtist(context,state);}
  case 'dailySongs':{const data=object(body.data),songs=requiredList(data.dailySongs);value={...scrub(body),tracks:mapped(songs,trackData),title:'每日推荐',description:'根据你的音乐口味生成，每日更新',creatorName:'网易云音乐',updatedAtMs:Date.now(),recommendations:mapped(data.recommendReasons,v=>({trackId:id(v.songId),reason:text(v.reason,1000)}))};break;}
  case 'intelligence':value={...scrub(body),tracks:mapped(body.data,value=>trackData(value.songInfo||value.song||value))};break;
  case 'privateFmModes':{const dsl=object(body.data?.crossPlatformResource?.dslData),sceneRoot=Array.isArray(dsl.currentSceneList)?dsl:Object.values(dsl).map(object).find(value=>Array.isArray(value.currentSceneList));const scenes=array(sceneRoot?.currentSceneList).filter(value=>typeof value.code==='string'&&value.code.trim()&&typeof value.title==='string'&&value.title.trim()).map(value=>({code:text(value.code,100),title:text(value.title,1000),cascadeMode:text(value.fmCascadeModeStr,1000)}));value={...scrub(body),scenes:[...new Map(scenes.map(value=>[value.code,value])).values()]};break;}
  case 'personalRadio':value={...scrub(body),tracks:mapped(body.data,trackData)};break;
  case 'searchSuggestions':{const result=object(body.result),types={songs:'track',artists:'artist',albums:'album',playlists:'playlist'};value={items:Object.keys(types).flatMap(key=>mapped(result[key],item=>({type:types[key],id:id(item.id),name:nonempty(item.name,1000)})))};break;}
  case 'search':{const result=object(body.result),rows=requiredList(result.djRadios),count=integer(result.djRadiosCount||result.djRadioCount||result.count,integer(p.offset)+rows.length),more=result.hasMore??result.more??(count>integer(p.offset)+rows.length||rows.length>=integer(p.limit,30,1,100));value={podcasts:mapped(rows,podcastData),hasMore:!!more&&rows.length>0,totalCount:count,fetchedCount:rows.length};break;}
  case 'searchDiscovery':value={categories:searchCategories(),recommendations:mapped(body.result,v=>({id:id(v.id),name:text(v.name),artworkUrl:artwork(v.picUrl||v.coverImgUrl)||null,copywriter:nullableText(v.copywriter),creatorNickname:nullableText(v.creator?.nickname)}))};break;
  case 'cloudSongs':value=cloudPage(body,p);break;
  case 'podcasts':value=mapped(requiredList(body.djRadios),podcastData);break;
  case 'subscribedPodcasts':value=podcastPage(body,p,true);break;
  case 'podcastHome':{const categories=mapped(body.categories,v=>({id:id(v.id),name:text(v.name)||'Podcast',picUrl:artwork(v.pic96x96Url||v.pic56x56Url)||null}));return featureRequest('/api/djradio/recommend/v1',{},context,{...state,step:'podcastHomeFeatured',categories});}
  case 'podcastDetail':{const podcast=podcastData(body.data);return featureRequest('/api/dj/program/byradio',{radioId:id(p.id||p.radioId),offset:integer(p.offset),limit:integer(p.limit,50,1,50),asc:false},context,{...state,step:'podcastDetailPrograms',podcast});}
  case 'podcastProgram':value=programData(body.program);if(value.id!==String(p.id||p.programId)||!value.mainSongId)problem('INVALID_RESPONSE');break;
  case 'podcastPrograms':value=programPage(body,p);break;
  case 'userPlayRecords':value=mapped(requiredList(p.allTime?body.allData:body.weekData),v=>({song:accountSongData(v.song),playCount:nonnegative(v.playCount),score:nonnegative(v.score)}));break;
  case 'recentSongs':{const unique=new Map();for(const v of array(body.data?.list)){if(!v.data)continue;const song=accountSongData(v.data,v.playTime),old=unique.get(song.id);if(!old||Number(song.playedAt)>Number(old.playedAt))unique.set(song.id,song);}value=[...unique.values()];break;}
  case 'listeningStatsSummary':value={totalSeconds:requiredNumber(statsData(body).totalDuration)};break;
  case 'listeningStatsReport':value=statsReport(body,p);break;
  case 'listeningStatsYears':value=statsYears(body);break;
  case 'songWiki':value=songWikiData(body);break;
  case 'phoneBinding':value={first:body.data?.bind===true,second:text(body.data?.number)||null};break;
  case 'protection':value=body.data===true;break;
  case 'devices':value=array(body.data?.userDeviceList).filter(v=>v.deviceKey).map(v=>({key:text(v.deviceKey),name:text(v.deviceName),region:text(v.loginPlace||v.region),lastActiveTime:integer(v.lastActiveTime,0,0,Number.MAX_SAFE_INTEGER),current:v.ifLoginDevice===true,os:text(v.os)})).sort((a,b)=>Number(b.current)-Number(a.current));break;
  case 'authorizations':value={records:array(body.data?.records).filter(v=>v.clientId).map(v=>({clientId:text(v.clientId),name:text(v.clientName||v.appName||v.name),description:text(v.description)})),cursor:text(body.data?.page?.cursor)||null,more:body.data?.page?.more===true};break;
  case 'bindings':value=array(body.bindings||body.data?.bindings).map(v=>{const info=parseJson(v.tokenJsonStr,{});return {type:integer(v.type),bound:true,displayName:text(info.nickname||info.screen_name||info.name)};});break;
  case 'recordPlaybackStart':case 'recordPlaybackDuration':value={httpAccepted:true,httpStatus:integer(response.status),code:integer(body.code),message:null,exceptionType:null,failureReason:null,endpoint:API+'/eapi/feedback/weblog'};break;
  case 'qrKey':value={key:text(body.unikey||body.data?.unikey),url:'https://music.163.com/login?codekey='+encodeURIComponent(body.unikey||body.data?.unikey||'')};if(!value.key)problem('INVALID_RESPONSE');break;
  case 'qrStatus':if(Number(body.code)===803){if(!array(response.setCookies).some(value=>/^MUSIC_U=[^;]+/.test(value)))problem('AUTH_REQUIRED');state.store.sessionType='Web';}value={code:integer(body.code),authenticated:Number(body.code)===803&&authenticated(context,state.store)};break;
  default:value=WRITE_ACTIONS.has(action)||['authorizePcQrLogin','cancelPcQrLogin'].includes(action)?true:scrub(body);break;
 }
 return done(publicIdentities(value),state,context);
}

function resolveConnectionArtist(context,state){const users=state.connectionPage.users;while(state.connectionArtistIndex<users.length){const user=users[state.connectionArtistIndex];if(user.hasVerifiedIdentity&&!user.artistId)return request('/api/v1/user/detail/'+id(user.id),{},context,{...state,step:'connectionArtist'},'eapi');state.connectionArtistIndex++;}return done(state.connectionPage,state,context);}

function searchCategories(){return [{id:'charts',title:'排行榜',kind:'playlist'},{id:'podcasts',title:'播客',kind:'podcasts'},...CATEGORIES.filter(value=>!['全部','轻音乐','怀旧','治愈'].includes(value)).map(value=>({id:value,title:value,kind:'playlist'}))];}

function parsePcQr(value){const raw=text(value,8192).trim(),match=raw.match(/^(https?):\/\/([^/?#]+)([^?#]*)(?:\?([^#]*))?(?:#.*)?$/i);if(!match||!/^music\.163\.com(?::(?:80|443))?$/i.test(match[2])||!['/login','/login/','/st/platform/scanlogin','/st/platform/scanlogin/'].includes(match[3]))return null;const fields={};for(const pair of String(match[4]||'').split('&')){if(!pair.trim())continue;const at=pair.indexOf('='),name=decodeLink(at<0?pair:pair.slice(0,at)),entry=decodeLink(at<0?'':pair.slice(at+1));if(name==null||entry==null)return null;(fields[name]??=[]).push(entry);}const key=fields.codekey?.find(value=>value.trim());if(!key||key.length>2048)return null;const trace=fields.login_traceId?.find(value=>value.trim());if(trace&&trace.length>2048)return null;return {key,clientTraceId:trace||null,rawValue:raw};}
