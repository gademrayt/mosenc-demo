(function(root){
 'use strict';
 const project='mosenc-wordpress-plan';
 function empty(ids){return {project,version:1,tasks:Object.fromEntries(ids.map(id=>[id,{done:false,note:''}]))};}
 function validate(value,ids){
  const obj=v=>v!==null && typeof v==='object' && !Array.isArray(v);
  if(!obj(value)||value.project!==project||value.version!==1||!obj(value.tasks))throw new Error('Это не файл прогресса Mosenc поддерживаемой версии.');
  const result=empty(ids),allowed=new Set(ids);
  for(const [id,item] of Object.entries(value.tasks)){
   if(!allowed.has(id)||!obj(item)||typeof item.done!=='boolean'||typeof item.note!=='string'||item.note.length>5000)throw new Error('Некорректная задача или заметка в файле прогресса.');
   result.tasks[id]={done:item.done,note:item.note};
  }
  return result;
 }
 const api={empty,validate};
 if(typeof module!=='undefined' && module.exports)module.exports=api;
 else root.PlanState=api;
})(typeof globalThis!=='undefined'?globalThis:this);
