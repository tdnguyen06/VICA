import type { ChoiceResult, NarrativeBlock, Scenario } from '../scenario.js';
import type { RegionalImage, RegionalStory } from './regional-types.js';
import { fiction, gameplay } from './regional-types.js';
import { regionalNarratives } from './regional-narratives.js';

export function buildRegionalScenario(story: RegionalStory): Scenario {
  const script = regionalNarratives[story.slug];
  if (!script) throw new Error('Missing authored narrative: ' + story.slug);
  const [guide, visitor] = script.cast;
  const say = (speaker: string, text: string): NarrativeBlock => ({ ...fiction(text), speaker });
  const pair = (lines: readonly [string,string], field: string) => {
    const visitorFirst = script.visitorFirst.includes(field);
    return [say(visitorFirst ? visitor : guide,lines[0]),say(visitorFirst ? guide : visitor,lines[1])];
  };
  const exchange = (lines: readonly [string,string,string]) => [fiction(lines[0]),say(visitor,lines[1]),say(guide,lines[2])];
  const image = (suffix: string) => story.slug + ':' + suffix;
  const result = (title: string, label: string | null, blocks: readonly NarrativeBlock[], imageRef: string, knowledgeIds: readonly string[] = []): ChoiceResult =>
    ({ title, journalLabel: label, blocks, imageRef, knowledgeIds });
  const knowledge = [...story.morning,...story.lunch].map(option => ({ id:option.id+'-note',text:option.fact,sourceIds:option.sourceIds,verification:'source-reviewed' as const,category:'fact' as const }));
  const note = (text: string): NarrativeBlock => ({text,kind:'culture',editorialStatus:'source-reviewed'});
  const morning = story.morning.map((option,index) => ({
    id:option.id,label:option.label,nextSceneId:'lunch' as const,
    result:{...result(option.label,option.label,[...exchange(script.morning[index]!),note(option.fact)],image(option.id),[option.id+'-note']),continueLabel:'Ghi nhớ câu chuyện — Tiếp tục'},
  }));
  const lunch = story.lunch.map((option,index) => ({
    id:option.id,label:option.label,nextSceneId:'afternoon' as const,
    result:result('Bữa trưa — '+option.label,option.label,[...exchange(script.lunch[index]!),note(option.fact),
      fiction(visitor+' nếm một chút trước, rồi tự điều chỉnh phần của mình cho vừa miệng. '+guide+' chờ bạn ăn cùng, không chọn khẩu vị hộ.')],image(option.id),[option.id+'-note']),
  }));
  const creativeId=story.slug+'-afternoon-creative', pauseId=story.slug+'-afternoon-pause';
  const postcardIds=[story.slug+'-postcard-scene',story.slug+'-postcard-colour'];
  const quietId=story.slug+'-pause-view',chatId=story.slug+'-pause-chat';
  const ending=(line:string)=>fiction(visitor+' giữ lại {morningMemory}, rồi {lunchMemory}. '+line);
  return {
    id:story.slug+'-one-day',version:'1.0.0',provinceSlug:story.slug,provinceName:story.name,
    title:'Một ngày ở '+story.name,editorialStatus:'review-ready',firstSceneId:'morning',
    cast:{guide,visitor},introImageRef:image('intro'),
    intro:[fiction(script.premise),...pair(script.intro,'intro'),gameplay('Đồng hành cùng '+visitor+' và lựa chọn các hoạt động để cùng nhau tạo nên một ngày đáng nhớ.')],
    scenes:{
      morning:{id:'morning',title:'Buổi sáng — '+story.name,imageRef:image('intro'),blocks:pair(script.morningPrompt,'morningPrompt'),choices:morning},
      lunch:{id:'lunch',title:'Buổi trưa — ăn cùng nhau',imageRef:image('meal'),blocks:pair(script.lunchPrompt,'lunchPrompt'),choices:lunch},
      afternoon:{id:'afternoon',title:'Buổi chiều — giữ lại một điều',imageRef:image('intro'),blocks:[...pair(script.afternoon,'afternoon'),gameplay('Buổi chiều êm ả, hãy chọn một hoạt động để khép lại hành trình hôm nay.')],choices:[
        {id:creativeId,label:'Làm một tấm bưu thiếp',nextSceneId:'creative',result:result('Một tờ giấy đang chờ',null,[fiction(guide+' đặt giấy và màu cạnh ảnh chặng sáng đã chọn. '+visitor+' kéo ghế lại gần, để hai người cùng nghĩ bố cục.'),...pair(script.creative,'creative')],image('postcard'))},
        {id:pauseId,label:'Dành một khoảng nghỉ',nextSceneId:'pause',result:result('Không cần vội thêm',null,[fiction('Hai người chọn một chỗ ngồi trong câu chuyện, để những việc khác chờ một lát.'),...pair(script.rest,'rest')],image('pause'))},
      ]},
      creative:{id:'creative',title:'Bưu thiếp của '+guide+' và '+visitor,imageRef:image('postcard'),blocks:[...pair(script.creative,'creative'),gameplay('Lưu giữ kỷ niệm chuyến đi qua tấm bưu thiếp đặc biệt của hai bạn.')],choices:story.postcardLabels.map((label,index)=>({
        id:postcardIds[index]!,label,nextSceneId:'journal' as const,
        result:result('Bưu thiếp — '+label,'Làm bưu thiếp: '+label,[...exchange(script.postcards[index]!),say(visitor,'Mình còn nhớ {morningMemory}, rồi cả {lunchMemory}.'),fiction(guide+' viết tên hai người ở góc giấy còn trống.')],image(index===0?'postcard-scene':'postcard-colour')),
      }))},
      pause:{id:'pause',title:'Một khoảng nghỉ ở '+story.name,imageRef:image('pause'),blocks:[say(guide,'Mình ngồi ngắm cảnh một lát, hay kể nhau nghe điều muốn nhớ?'),say(visitor,'Lần này mình chọn điều đang muốn làm thôi nhé.')],choices:[
        {id:quietId,label:'Ngồi ngắm cảnh',nextSceneId:'journal',result:result('Một khoảng không cần lấp đầy','Ngồi ngắm cảnh',exchange(script.quiet),image('pause'))},
        {id:chatId,label:'Trò chuyện về hành trình',nextSceneId:'journal',result:result('Ngày hôm nay, kể theo cách riêng','Trò chuyện về hành trình',[say(visitor,'Mình nhớ {morningMemory}. Rồi cả {lunchMemory} nữa.'),...pair(script.chat,'chat'),fiction('Hai người thay nhau kể. Cùng một ngày, mỗi người giữ lại một chi tiết khác nhau.')],image('pause'))},
      ]},
    },knowledge,
    recallByChoice:Object.fromEntries([...story.morning,...story.lunch].map((option,index)=>[option.id,script.memories[index]!])),
    endingTemplate:ending(script.endings[0]!),endingByChoice:{[postcardIds[0]!]:ending(script.endings[0]!),[postcardIds[1]!]:ending(script.endings[1]!),[quietId]:ending(script.endings[2]!),[chatId]:ending(script.endings[3]!)},
    imageRefs:['intro','meal','postcard','postcard-scene','postcard-colour','pause',...story.morning.map(o=>o.id),...story.lunch.map(o=>o.id)].map(image),
    sourceRefs:[...new Set(knowledge.flatMap(note=>note.sourceIds))],
  };
}
export function buildRegionalImages(story: RegionalStory): readonly RegionalImage[] {
  const base = { accent: story.accent, province: story.name };
  const image = (suffix: string, label: string, motif: RegionalImage['motif']): RegionalImage => ({ ...base, id: story.slug + ':' + suffix, label, motif });
  return [
    image('intro', story.name, story.morning[0].motif), image('meal', 'Bữa trưa cùng bạn', 'meal'),
    image('pause', 'Khoảng nghỉ ở ' + story.name, story.morning[0].motif),
    image('postcard', 'Tấm bưu thiếp đang chờ', 'postcard-scene'),
    image('postcard-scene', story.postcardLabels[0], 'postcard-scene'),
    image('postcard-colour', story.postcardLabels[1], 'postcard-colour'),
    ...story.morning.map(option => image(option.id, option.label, option.motif)),
    ...story.lunch.map(option => image(option.id, option.label, 'meal')),
  ];
}
