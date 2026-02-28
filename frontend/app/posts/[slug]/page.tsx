import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import api from "../../../lib/api";

interface Post {
  id: number;
  title: string;
  slug: string;
  content: string;
}

export default function PostPage() {
  const router = useRouter();
  const { slug } = router.query;
  const [post, setPost] = useState<Post | null>(null);

  useEffect(() => {
    if (slug) {
      api
        .get(`/posts/${slug}/`)
        .then((res) => setPost(res.data))
        .catch((err) => console.error(err));
    }
  }, [slug]);

  if (!post) return <div>Loading...</div>;

  return (
    <div className="container mx-auto">
      <h1 className="text-3xl font-bold my-4">{post.title}</h1>
      <div className="prose">
        <div dangerouslySetInnerHTML={{ __html: post.content }} />
      </div>
    </div>
  );
}
