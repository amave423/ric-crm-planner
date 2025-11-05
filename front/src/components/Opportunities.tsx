import CRMIcon from '../assets/CRMIcon.svg';
import MeetPointIcon from '../assets/MeetPointIcon.svg';
import PageBuilderIcon from '../assets/PageBuilderIcon.svg';
import FeedbackIcon from '../assets/FeedbackIcon.svg';
import ManagementIcon from '../assets/ManagementIcon.svg';
import JointWorkIcon from '../assets/JointWorkIcon.svg';

const items = [
  {
    title: 'CRM модуль',
    icon: CRMIcon,
    desc: 'Формирование форм, сбор заявок и управление контактами для эффективного взаимодействия.',
  },
  {
    title: 'Точка сборки',
    icon: MeetPointIcon,
    desc: 'Удобная платформа для совместной работы и обсуждения проектных решений.',
  },
  {
    title: 'Конструктор страниц',
    icon: PageBuilderIcon,
    desc: 'Шаблоны для создания страниц с объявлениями о стажировке и практике.',
  },
  {
    title: 'Обратная связь и оценки',
    icon: FeedbackIcon,
    desc: 'Регулярная оценка компетенций и получение рекомендаций для роста.',
  },
  {
    title: 'Управление проектами и задачами',
    icon: ManagementIcon,
    desc: 'Планирование, распределение задач и контроль сроков с диаграммой Ганта и Канбан.',
  },
  {
    title: 'Совместная работа и командное взаимодействие',
    icon: JointWorkIcon,
    desc: 'Эффективное сотрудничество, организация команд и проведение планёрок.',
  },
];

export default function Opportunities() {
  return (
    <div className="OpportunitiesInfoContainer">
      <h1 className="OpportunitiesInfoTitle">Возможности MeetPoint</h1>
      <p>MeetPoint предоставляет мощный личный кабинет для стажеров и множество функциональных возможностей.</p>
      <ul className="OpportunitiesList">
        {items.map((it) => (
          <li key={it.title} className="OpportunitiesListItem">
            <img src={it.icon} alt={it.title} />
            <h2 className="OpportunitiesTitle">{it.title}</h2>
            <p className="OpportunitiesDescription">{it.desc}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
