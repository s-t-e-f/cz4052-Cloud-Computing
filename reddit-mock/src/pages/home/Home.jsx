import Topbar from "../../components/topbar/Topbar";
import Sidebar from "../../components/sidebar/Sidebar";
import Feed from "../../components/feed/Feed";
import Rightbar from "../../components/rightbar/Rightbar";
import "./home.css"

import { useState, useEffect } from "react";
import axios from "axios";

export default function Home() {

  const [Users, setUsers] = useState([]);
  const [user, setUser] = useState([]);

  //sample user (normal)
  // const userid=3;

  // sample user (expert)
  const userid=2;

  useEffect(() => {
    const fetchUsers = async () => {
      const res = await axios.get('/getUsers');
      console.log(res.data);
      setUsers(res.data);
      setUser(res.data.filter(user => user.id===userid)[0]);
    };
    fetchUsers();
  }, []);

  console.log(user);


  return (
    <>
      <Topbar user={user}/>
      <div className="homeContainer">
        <Sidebar user={user} />
        <Feed user={user} Users={Users}/>
        <Rightbar user={user}/>
      </div>
    </>
  );
}
