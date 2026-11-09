const SHUFFLE_PARENT='RandomPlaylist_Adjustment_Android';
const SHUFFLE_CHILDREN={t1:'RandomPlaylist_Adjustment_T1_Android',t2:'RandomPlaylist_Adjustment_T2_Android',t3:'RandomPlaylist_Adjustment_T3_Android'};
function shufflePolicyResponse(body,name){
 if(!body||Number(body.code)!==200||!Array.isArray(body.data))return null;
 const row=body.data.find(value=>value&&value.abtestname===name),data={};
 if(row){
  const group=['c','t','t1','t2','t3','t4'].includes(row.abtestgroup)?row.abtestgroup:'c',raw=object(row.clientConfig),clientConfig={};
  for(const key of ['a0','b0','c0','d0','e0','maxFetchPlayRecordCount0','a4','a5','a6'])if(has(raw,key))clientConfig[key]=typeof raw[key]==='string'?text(raw[key].trim(),1000):typeof raw[key]==='number'?raw[key]:null;
  data[name]={expGroupName:group,clientConfig};
 }
 return {code:200,data};
}
function shufflePolicyRequest(context,state,name=SHUFFLE_PARENT){return request('/api/experiment/group/batch/get',{codeNames:name},context,{...state,step:name===SHUFFLE_PARENT?'shufflePolicyParent':'shufflePolicyChild'},'eapi',{errorResponse:true,headers:{'X-Netease-Eapi-Profile':'android'}});}
function respondShufflePolicy(response,state,context){
 let body;try{body=parseResponse(response,state,context);}catch(error){if(['AUTH_REQUIRED','AUTH_EXPIRED','CANCELLED'].includes(error.sourceCode))throw error;body=null;}
 if(state.step==='shufflePolicyParent'){
  const parent=shufflePolicyResponse(body,SHUFFLE_PARENT),name=SHUFFLE_CHILDREN[parent?.data?.[SHUFFLE_PARENT]?.expGroupName];
  return name?shufflePolicyRequest(context,{...state,shuffleParent:parent},name):done({parent,child:null},state,context);
 }
 if(state.step==='shufflePolicyChild'){
  const name=SHUFFLE_CHILDREN[state.shuffleParent?.data?.[SHUFFLE_PARENT]?.expGroupName];
  return done({parent:state.shuffleParent,child:shufflePolicyResponse(body,name)},state,context);
 }
 problem('INVALID_RESPONSE');
}
