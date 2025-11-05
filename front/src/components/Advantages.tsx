import IntegrationIcon from '../assets/IntegrationIcon.svg';
import DevelopmentIcon from '../assets/DevelopmentIcon.svg';
import PersonalizationIcon from '../assets/PersonalizationIcon.svg';

const items = [
  {
    title: 'Интеграция инструментов',
    icon: IntegrationIcon,
    desc: 'MeetPoint объединяет совместную работу, управление проектами и CRM в одной платформе.',
  },
  {
    title: 'Профессиональное развитие',
    icon: DevelopmentIcon,
    desc: 'Платформа способствует постоянному развитию навыков через оценку компетенций и обратную связь.',
  },
  {
    title: 'Гибкость и персонализация',
    icon: PersonalizationIcon,
    desc: 'Гибкие настройки для управления проектами и командами в соответствии с потребностями.',
  },
];

export default function Advantages(): JSX.Element {
  return (
    <div className="AdvantagesInfoContainer">
      <h1 className="AdvantagesInfoTitle">Преимущеcтва сервиса MeetPoint</h1>
      <ul className="AdvantagesList">
        {items.map((it) => (
          <li key={it.title} className="AdvantagesListItem">
            <img src={it.icon} alt={it.title} />
            <h3 className="AdvantagesTitle">{it.title}</h3>
            <p className="AdvantagesDescription">{it.desc}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
