import { ArrowUpRight, Check } from "lucide-react";
import Image from "next/image";
import { useId } from "react";

export type TravelOption = {
  id: string;
  title: string;
  description: string;
  tag: string;
  image?: string;
};

export type TravelQuestion = {
  id: string;
  step: number;
  text: string;
  options: [TravelOption, TravelOption];
};

// Category IDs match infra/data/normalized/categories.csv.
export const vehicleQuestion: TravelQuestion = {
  id: "vehicle",
  step: 1,
  text: "어떤 전기차로 떠나시나요?",
  options: [
    { id: "g80-ev", title: "Electrified G80", description: "87.2 kWh 모델 · 인증 주행거리 427 km. 여유롭고 편안한 전기 세단으로 떠나요.", tag: "GENESIS · DC 콤보", image: "/images/vehicles/g80-ev.webp" },
    { id: "ioniq5", title: "아이오닉 5", description: "84 kWh 롱레인지 2WD · 인증 주행거리 최대 485 km. 넉넉한 공간의 전기 SUV로 떠나요.", tag: "HYUNDAI · DC 콤보", image: "/images/vehicles/ioniq5.webp" },
  ],
};

export const atmosphereQuestion: TravelQuestion = {
  id: "atmosphere",
  step: 2,
  text: "먼저, 어떤 여행에 더 마음이 가나요?",
  options: [
    { id: "NA", title: "자연 속에서 쉬어가기", description: "바다와 산, 푸른 풍경을 바라보며 잠시 일상에서 벗어나고 싶어요.", tag: "자연관광" },
    { id: "VE", title: "새로운 이야기 발견하기", description: "역사와 전시, 그 지역만의 문화를 만나며 새로운 영감을 얻고 싶어요.", tag: "역사 · 문화관광" },
  ],
};

export function getDetailQuestion(atmosphere: string): TravelQuestion {
  return atmosphere === "NA" ? {
    id: "nature",
    step: 3,
    text: "자연 속 휴식, 어떤 풍경이면 더 좋을까요?",
    options: [
      { id: "NA02", title: "탁 트인 물가", description: "파도 소리를 듣는 해변이나 잔잔한 강을 따라 여유롭게 걷고 싶어요.", tag: "자연경관(하천‧해양)" },
      { id: "NA01", title: "초록빛 산과 숲", description: "맑은 공기를 마시며 산길을 걷고, 초록 풍경 속에서 쉬고 싶어요.", tag: "자연경관(산)" },
    ],
  } : {
    id: "culture",
    step: 3,
    text: "새로운 발견, 어떤 이야기가 더 궁금한가요?",
    options: [
      { id: "HS01", title: "시간을 거슬러 가는 여행", description: "고궁과 역사유적지를 거닐며 그곳에 쌓인 오래된 이야기를 만나고 싶어요.", tag: "역사유적지" },
      { id: "VE07", title: "취향을 채우는 전시", description: "박물관과 전시 공간에서 작품을 감상하며 새로운 시선을 발견하고 싶어요.", tag: "전시시설" },
    ],
  };
}

export const timeQuestion: TravelQuestion = {
  id: "time",
  step: 4,
  text: "여행에서 꼭 담고 싶은 순간은 언제인가요?",
  options: [
    { id: "sunrise", title: "하루를 여는 일출", description: "조금 일찍 일어나, 하늘이 밝아지는 고요한 아침을 만나고 싶어요.", tag: "일출" },
    { id: "sunset", title: "하루를 물들이는 일몰", description: "느긋하게 하루를 보내고, 붉게 물드는 하늘을 바라보며 마무리하고 싶어요.", tag: "일몰" },
  ],
};

export type TripSettings = { batteryPercent: number; date: string };

export function TravelQuestionCards({ question, selectedId, disabled, onSelect, settings, onSettingsChange }: {
  question: TravelQuestion;
  selectedId?: string;
  disabled: boolean;
  onSelect: (option: TravelOption) => void;
  settings: TripSettings;
  onSettingsChange: (settings: TripSettings) => void;
}) {
  const settingsId = useId();
  return (
    <div className="mt-4 max-sm:-ml-[50px] max-sm:w-[calc(100%+50px)]">
      <p className="mb-3 text-xs font-medium text-[#8b95a1]">여행 취향 알아보기 · {question.step} / 4</p>
      {question.id === "vehicle" && <div className="mb-4 rounded-2xl bg-[#f2f4f6] p-5">
        <label htmlFor={`${settingsId}-battery`} className="flex justify-between text-sm text-[#4e5968]">출발 배터리 <strong>{settings.batteryPercent}%</strong></label>
        <input id={`${settingsId}-battery`} type="range" min={21} max={100} value={settings.batteryPercent} disabled={disabled}
          onChange={(event) => onSettingsChange({ ...settings, batteryPercent: Number(event.target.value) })}
          className="mt-3 w-full accent-[#0071e3]" />
        <label htmlFor={`${settingsId}-date`} className="mt-4 mb-2 block text-sm text-[#4e5968]">여행 날짜</label>
        <input id={`${settingsId}-date`} type="date" required value={settings.date} disabled={disabled}
          onChange={(event) => { if (event.target.value) onSettingsChange({ ...settings, date: event.target.value }); }}
          className="min-h-11 max-w-full rounded-xl border border-[#d2d2d7] bg-white px-3 text-sm text-[#1d1d1f] focus-visible:outline-[#0071e3]" />
        <p className="mt-3 text-xs leading-5 text-[#8b95a1]">도착 후 충전소까지 이동할 여유와 배터리 잔량 20%를 고려해요. 아래에서 차량을 선택하면 다음으로 넘어가요.</p>
      </div>}
      <div role="group" aria-label={question.text} className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        {question.options.map((option, index) => {
          const selected = option.id === selectedId;
          return (
            <button
              key={option.id}
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              onClick={() => onSelect(option)}
              className={`group flex min-h-[224px] flex-col rounded-[16px] bg-[#f2f4f6] p-6 text-left text-[#1d1d1f] transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#3182f6] sm:min-h-[248px] sm:p-7 ${selected ? "ring-2 ring-[#3182f6]" : ""} ${disabled ? "cursor-default" : "cursor-pointer hover:bg-[#e9ecef]"}`}
            >
              <span className="mb-4 text-xs font-semibold text-[#8b95a1]">{index === 0 ? "A" : "B"} · {option.tag}</span>
              {option.image && <Image src={option.image} alt={option.title} width={1200} height={750} sizes="(max-width: 640px) 100vw, 360px" className="mb-5 aspect-[8/5] w-full rounded-xl object-cover" />}
              <span className="text-xl leading-[1.35] font-bold tracking-[-0.04em] break-keep">{option.title}</span>
              <span className="mt-3 text-[15px] leading-[1.6] tracking-[-0.02em] break-keep text-[#4e5968]">{option.description}</span>
              <span className="mt-auto flex items-center gap-1.5 pt-6 text-sm font-semibold text-[#3182f6]">
                {selected ? <>선택했어요<Check size={16} aria-hidden="true" /></> : <>이쪽이 좋아요<ArrowUpRight size={16} aria-hidden="true" /></>}
              </span>
            </button>
          );
        })}
      </div>
      {question.id === "vehicle" && <p className="mt-3 text-xs leading-5 text-[#8b95a1]">차량 이미지 · <a href="https://www.genesis.com/ae/en/models/luxury-sedan-genesis/electrified-g80/design.html" target="_blank" rel="noreferrer" className="underline">Genesis</a> / <a href="https://www.hyundai.com/la/en/find-a-car/ioniq5/exterior" target="_blank" rel="noreferrer" className="underline">Hyundai</a>. 이미지는 참고용이며 연식·트림에 따라 다를 수 있어요.</p>}
    </div>
  );
}
