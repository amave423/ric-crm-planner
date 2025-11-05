import { useEffect } from 'react';
import Hero from '../components/Hero';
import Opportunities from '../components/Opportunities';
import Advantages from '../components/Advantages';

export default function MainPage() {
  useEffect(() => {
    document.title = 'MeetPoint';
  }, []);

  return (
    <div className="MainPageContainer">
      <Hero />
      <Opportunities />
      <Advantages />
    </div>
  );
}
