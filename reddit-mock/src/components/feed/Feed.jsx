import { useEffect, useState } from "react";
import Post from "../post/Post";
import "./feed.css";
import axios from "axios";

export default function Feed( {user, Users} ) {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    const fetchPosts = async () => {
      const res = await axios.get('/getUsersByIdLambdaUrl');
      console.log(res);
      setPosts(res.data);
    };
    fetchPosts();
  }, []);

  return (
    <div className="feed">
      <div className="feedWrapper">
        {posts.map((p) => (
          <Post key={p._id} post={p} user={user} userPost={Users.filter(user => user.id === p.userId)[0]} Users={Users} />
        ))}
      </div>
    </div>
  );
}
