import MainPageImage from '../assets/MainPageImage.png';

export default function Hero() {
  return (
    <div className="MainInfoContainer">
      <div className="MainInfoLeftSide">
        <h1 className="MainIfoTitle">Откройте для себя новые возможности с MeetPoint!</h1>
        <p>
          MeetPoint - инновационная платформа для профессионального развития, предоставляющая
          все необходимые инструменты для эффективной работы и управления проектами.
        </p>
        <div className="HeroActions">
          <button className="PrimaryBtn">Попробовать</button>
        </div>
      </div>
      <img src={MainPageImage} alt="Main Page" />
    </div>
  );
}
