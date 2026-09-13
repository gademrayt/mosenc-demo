/* Browser-local state. No network calls; imported notes are always plain text. */
(function(){
 'use strict';
 const data=JSON.parse(document.getElementById('plan-data').textContent);
 const ids=data.tasks.map(t=>t.id),key='mosenc-wordpress-plan.progress.v1';
 let state=PlanState.empty(ids),raw=null,saveBlocked=false;
 const status=document.getElementById('status');
 function message(text,error=false){status.textContent=text;status.classList.toggle('error',error);}
 try{raw=localStorage.getItem(key);if(raw)state=PlanState.validate(JSON.parse(raw),ids);}
 catch(e){saveBlocked=true;message('Сохранённые данные недоступны или повреждены. Не перезаписываем их. Экспортируй резервную копию и затем загрузи исправный экспорт или явно сбрось отметки.',true);}
 function save(){
  if(saveBlocked){message('Изменения только в памяти вкладки. Сохранение заблокировано: сначала экспортируй данные и восстанови хранилище.',true);return;}
  try{localStorage.setItem(key,JSON.stringify(state));message('Галочки и заметки сохранены в этом браузере.');}
  catch(e){saveBlocked=true;message('Браузер не сохранил изменения. Не закрывай вкладку: используй экспорт.',true);}
 }
 function apply(){
  for(const id of ids){document.getElementById('check-'+id).checked=state.tasks[id].done;document.getElementById('note-'+id).value=state.tasks[id].note;}
  update();
 }
 function update(){
  for(const id of ids)document.getElementById(id).classList.toggle('done',state.tasks[id].done);
  const required=data.tasks.filter(t=>!t.id.startsWith('X'));
  const done=required.filter(t=>state.tasks[t.id].done).length;
  const demo=data.tasks.filter(t=>data.phases.find(p=>p.id===t.phase).track==='demo');
  const demoDone=demo.filter(t=>state.tasks[t.id].done).length;
  document.getElementById('count').textContent=done+' / '+required.length;
  document.getElementById('percent').textContent=Math.round(done/required.length*100)+'%';
  document.getElementById('progress').value=done;document.getElementById('progress').max=required.length;
  document.getElementById('demo-count').textContent='До завершения показа: '+demoDone+' / '+demo.length+' шагов';
  for(const phase of data.phases){const ts=data.tasks.filter(t=>t.phase===phase.id);document.querySelector('[data-phase-count="'+phase.id+'"]').textContent=ts.filter(t=>state.tasks[t.id].done).length+'/'+ts.length;}
  const next=required.find(t=>!state.tasks[t.id].done);
  document.getElementById('next-title').textContent=next?next.id+' · '+next.title:'Основной маршрут отмечен. Сохрани экспорт и результаты проверок.';
  document.getElementById('next-button').disabled=!next;
  filter();
 }
 function filter(){
  const mode=document.getElementById('filter').value;
  for(const task of data.tasks){const done=state.tasks[task.id].done;document.getElementById(task.id).hidden=mode==='open'?done:mode==='done'?!done:false;}
  for(const phase of data.phases){const visible=data.tasks.some(t=>t.phase===phase.id&&!document.getElementById(t.id).hidden);document.getElementById('phase-'+phase.id).hidden=!visible;}
  document.getElementById('empty').hidden=data.tasks.some(t=>!document.getElementById(t.id).hidden);
 }
 for(const id of ids){
  document.getElementById('check-'+id).addEventListener('change',e=>{state.tasks[id].done=e.target.checked;save();update();});
  document.getElementById('note-'+id).addEventListener('input',e=>{state.tasks[id].note=e.target.value;save();});
 }
 document.getElementById('filter').addEventListener('change',filter);
 document.getElementById('next-button').addEventListener('click',()=>{
  const task=data.tasks.find(t=>!t.id.startsWith('X')&&!state.tasks[t.id].done);if(!task)return;
  document.getElementById('filter').value='all';filter();
  const el=document.getElementById(task.id);el.querySelector('details').open=true;el.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});el.querySelector('summary').focus({preventScroll:true});
 });
 document.querySelectorAll('.navlink').forEach(a=>a.addEventListener('click',()=>{document.getElementById('filter').value='all';filter();}));
 function download(text,name){
  const url=URL.createObjectURL(new Blob([text],{type:'application/json;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 document.getElementById('export').addEventListener('click',()=>{
  download(JSON.stringify(state,null,2),'mosenc-progress-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json');
  message('Экспорт создан. Сохрани файл приватно: он содержит твои заметки.');
 });
 document.getElementById('raw-backup').hidden=!(saveBlocked&&raw);
 document.getElementById('raw-backup').addEventListener('click',()=>download(raw||'','mosenc-progress-recovery.json'));
 document.getElementById('import').addEventListener('click',()=>document.getElementById('import-file').click());
 document.getElementById('import-file').addEventListener('change',async e=>{
  const file=e.target.files[0];if(!file)return;
  try{
   if(file.size>1000000)throw new Error('Файл слишком большой (максимум 1 МБ).');
   const loaded=PlanState.validate(JSON.parse(await file.text()),ids);
   if(!confirm('Заменить текущие галочки и заметки загруженными? Сначала экспортируй текущие, если они нужны.')){message('Загрузка отменена. Текущие отметки сохранены.');return;}
   state=loaded;saveBlocked=false;save();apply();
   if(!saveBlocked){document.getElementById('raw-backup').hidden=true;message('Отметки загружены и сохранены в этом браузере.');}
  }catch(err){message('Файл не загружен. '+err.message+' Текущие данные не изменены.',true);}
  finally{e.target.value='';}
 });
 document.getElementById('reset').addEventListener('click',()=>{
  if(!confirm('Сбросить все галочки и заметки этого плана? Старые проекты не затрагиваются. Сначала сохрани экспорт.'))return;
  state=PlanState.empty(ids);saveBlocked=false;save();apply();
  if(!saveBlocked){document.getElementById('raw-backup').hidden=true;message('Отметки этого плана сброшены.');}
 });
 window.addEventListener('storage',e=>{if(e.key===key){saveBlocked=true;message('Прогресс изменён в другой вкладке. Экспортируй несохранённые заметки этой вкладки и обнови страницу перед продолжением.',true);}});
 document.querySelectorAll('[data-copy]').forEach(button=>button.addEventListener('click',async()=>{
  const field=document.getElementById(button.dataset.copy);
  try{await navigator.clipboard.writeText(field.value);button.textContent='Скопировано';message('Запрос скопирован. Вставь его в выбранный инструмент.');}
  catch(e){field.focus();field.select();message('Текст выделен. Нажми Ctrl+C: браузер не разрешил автоматическое копирование.');}
 }));
 document.getElementById('expand').addEventListener('click',()=>document.querySelectorAll('.task>details').forEach(d=>d.open=true));
 document.getElementById('collapse').addEventListener('click',()=>document.querySelectorAll('.task>details').forEach(d=>d.open=false));
 let printSnapshot=null;
 function beforePrint(){
  if(printSnapshot)return;
  printSnapshot={details:Array.from(document.querySelectorAll('.task>details')).map(d=>[d,d.open]),hidden:Array.from(document.querySelectorAll('.task,.phase')).map(el=>[el,el.hidden])};
  printSnapshot.details.forEach(([d])=>d.open=true);printSnapshot.hidden.forEach(([el])=>el.hidden=false);
  document.querySelectorAll('.task-body>textarea').forEach(t=>{t.style.height=t.scrollHeight+'px';});
 }
 function afterPrint(){
  if(!printSnapshot)return;
  printSnapshot.details.forEach(([d,open])=>d.open=open);printSnapshot.hidden.forEach(([el,hidden])=>el.hidden=hidden);
  document.querySelectorAll('.task-body>textarea').forEach(t=>t.style.height='');printSnapshot=null;
 }
 window.addEventListener('beforeprint',beforePrint);window.addEventListener('afterprint',afterPrint);
 document.getElementById('print').addEventListener('click',()=>window.print());
 apply();
})();
