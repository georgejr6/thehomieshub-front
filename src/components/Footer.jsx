import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, FileText, Heart, Mail, Crown } from 'lucide-react';
import StoreBadges from '@/components/StoreBadges';

const Footer = () => {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="w-full border-t border-border bg-background/50 backdrop-blur-sm mt-auto">
            <div className="container mx-auto py-8 px-4 md:px-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div className="space-y-3">
                        <h3 className="font-bold text-lg text-primary">The Homies Hub</h3>
                        <p className="text-sm text-muted-foreground">
                            A community for men to connect, share experiences, and grow together.
                        </p>
                        <div className="pt-1">
                            <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wide mb-2">Get the app</h4>
                            <StoreBadges surface="footer" size="sm" />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h4 className="font-semibold text-sm">Legal</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li>
                                <Link to="/terms" className="hover:text-primary flex items-center gap-2">
                                    <FileText className="h-3 w-3" /> Terms of Service
                                </Link>
                            </li>
                            <li>
                                <Link to="/privacy" className="hover:text-primary flex items-center gap-2">
                                    <Shield className="h-3 w-3" /> Privacy Policy
                                </Link>
                            </li>
                        </ul>
                    </div>

                    <div className="space-y-3">
                        <h4 className="font-semibold text-sm">Community</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li>
                                <Link to="/community-guidelines" className="hover:text-primary flex items-center gap-2">
                                    <Heart className="h-3 w-3" /> Guidelines
                                </Link>
                            </li>
                            <li>
                                <Link to="/memberships" className="hover:text-primary flex items-center gap-2">
                                    <Crown className="h-3 w-3" /> Memberships
                                </Link>
                            </li>
                            <li>
                                <Link to="/admin/login" className="hover:text-primary">
                                    Admin Access
                                </Link>
                            </li>
                        </ul>
                    </div>

                    <div className="space-y-3">
                        <h4 className="font-semibold text-sm">Contact</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li>
                                <a href="mailto:support@homieshub.com" className="hover:text-primary flex items-center gap-2">
                                    <Mail className="h-3 w-3" /> Support
                                </a>
                            </li>
                            <li>
                                <a href="mailto:abuse@homieshub.com" className="hover:text-primary flex items-center gap-2">
                                    <Shield className="h-3 w-3" /> Report Abuse
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>
                
                <div className="mt-8 pt-6 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted-foreground">
                    <p>&copy; {currentYear} The Homies Hub. All rights reserved.</p>
                    <p>18+ Content Available</p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;